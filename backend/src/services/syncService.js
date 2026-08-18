const { v4: uuidv4, validate: isUuid } = require('uuid');
const personaRepository = require('../repositories/personaRepository');
const syncRepository = require('../repositories/syncRepository');

/**
 * Estrategia de resolución de conflictos: "servidor gana por defecto,
 * salvo que el cambio del dispositivo sea más reciente" (last-write-wins
 * basado en updated_at). Se puede sustituir por 'device_wins' o
 * 'manual' pasando el parámetro strategy.
 */
function resolveConflict(serverRecord, incoming, strategy = 'last_write_wins') {
  if (!serverRecord) return { winner: 'incoming', reason: 'no_existe_en_servidor' };

  if (strategy === 'device_wins') {
    return { winner: 'incoming', reason: 'estrategia_device_wins' };
  }
  if (strategy === 'server_wins') {
    return { winner: 'server', reason: 'estrategia_server_wins' };
  }

  // last_write_wins: compara updated_at del servidor vs el timestamp que trae el registro offline
  const serverTime = new Date(serverRecord.updated_at).getTime();
  const incomingTime = new Date(incoming.updated_at || incoming.client_updated_at).getTime();

  if (incomingTime > serverTime) {
    return { winner: 'incoming', reason: 'incoming_mas_reciente' };
  }
  return { winner: 'server', reason: 'server_mas_reciente_o_igual' };
}

const syncService = {
  resolveConflict, // exportado para poder testear en aislado

  /**
   * Procesa el lote de operaciones pendientes que sube la tablet.
   * operations: [{ uuid, action: 'INSERT'|'UPDATE'|'DELETE', payload, client_updated_at }]
   */
  async processUpload({ device_id, operations, strategy = 'last_write_wins' }) {
    if (!device_id) {
      const err = new Error('device_id es requerido');
      err.status = 400;
      throw err;
    }
    if (!Array.isArray(operations)) {
      const err = new Error('operations debe ser un arreglo');
      err.status = 400;
      throw err;
    }

    const results = [];

    for (const op of operations) {
      try {
        const uuid = op.uuid && isUuid(op.uuid) ? op.uuid : uuidv4();

        if (op.entity === 'historial') {
          const historialRepository = require('../repositories/historialRepository');
          if (op.action === 'INSERT') {
            await historialRepository.logEvento({ ...op.payload, device_id });
            results.push({ uuid, status: 'synced', action: 'INSERT' });
          }
          continue;
        }

        const existing = await personaRepository.findByUuid(uuid);

        if (op.action === 'DELETE') {
          if (existing) {
            await personaRepository.softDelete(uuid, device_id);
          }
          await syncRepository.logOperation({
            entity: 'personas', entity_uuid: uuid, action: 'DELETE', payload: op.payload, device_id
          });
          results.push({ uuid, status: 'synced', action: 'DELETE' });
          continue;
        }

        // INSERT o UPDATE -> UPSERT por UUID
        if (!existing) {
          const duplicate = op.payload.documento ? await personaRepository.findByDocumento(op.payload.documento) : null;
          
          if (duplicate) {
            const canonical_uuid = duplicate.uuid;
            const { winner, reason } = resolveConflict(duplicate, {
              ...op.payload,
              client_updated_at: op.client_updated_at
            }, strategy);
            
            if (winner === 'incoming') {
              const updated = await personaRepository.update(canonical_uuid, { ...op.payload, device_id });
              await syncRepository.logOperation({
                entity: 'personas', entity_uuid: canonical_uuid, action: 'UPDATE', payload: updated, device_id
              });
              results.push({ uuid: op.uuid, canonical_uuid, status: 'synced', action: 'UPDATE', record: updated, conflict: reason });
            } else {
              results.push({
                uuid: op.uuid, canonical_uuid, status: 'conflict_resolved_server_wins', record: duplicate, conflict: reason
              });
            }
          } else {
            const created = await personaRepository.create({ ...op.payload, uuid, device_id });
            await syncRepository.logOperation({
              entity: 'personas', entity_uuid: uuid, action: 'INSERT', payload: created, device_id
            });
            results.push({ uuid, status: 'synced', action: 'INSERT', record: created });
          }
          continue;
        }

        // Ya existe -> resolver conflicto antes de sobrescribir
        const { winner, reason } = resolveConflict(existing, {
          ...op.payload,
          client_updated_at: op.client_updated_at
        }, strategy);

        if (winner === 'incoming') {
          const updated = await personaRepository.update(uuid, { ...op.payload, device_id });
          await syncRepository.logOperation({
            entity: 'personas', entity_uuid: uuid, action: 'UPDATE', payload: updated, device_id
          });
          results.push({ uuid, status: 'synced', action: 'UPDATE', record: updated, conflict: reason });
        } else {
          // El servidor tenía la versión más reciente: no se sobrescribe,
          // se le devuelve al cliente el registro del servidor para que actualice localmente
          results.push({
            uuid, status: 'conflict_resolved_server_wins', record: existing, conflict: reason
          });
        }
      } catch (err) {
        results.push({ uuid: op.uuid, status: 'error', message: err.message });
      }
    }

    return results;
  },

  /**
   * Devuelve los cambios del servidor posteriores al último sync del dispositivo
   * (sincronización incremental usando sync_state).
   */
  async processDownload(device_id) {
    if (!device_id) {
      const err = new Error('device_id es requerido');
      err.status = 400;
      throw err;
    }

    const state = await syncRepository.getState(device_id);
    const since = state && state.last_sync_at ? state.last_sync_at : '1970-01-01 00:00:00';

    const changes = await personaRepository.findUpdatedSince(since);
    const newSyncTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    return { since, changes, syncedAt: newSyncTimestamp };
  },

  /**
   * Confirma que la tablet aplicó los cambios descargados con éxito,
   * y actualiza sync_state para la próxima sincronización incremental.
   */
  async confirmSync({ device_id, syncedAt }) {
    return syncRepository.upsertState(device_id, {
      last_sync_at: syncedAt,
      last_version: Date.now()
    });
  }
};

module.exports = syncService;
