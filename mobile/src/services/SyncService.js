import RemoteDataSource from '../datasources/RemoteDataSource';
import LocalDataSource from '../datasources/LocalDataSource';
import SyncRepository from '../repositories/SyncRepository';
import PersonaRepository from '../repositories/PersonaRepository';
import NetworkService from './NetworkService';
import AuthService from './AuthService';

let syncing = false; // evita ejecuciones concurrentes (ej: listener de red + botón manual)

const SyncService = {
  /**
   * Ejecuta el flujo completo de sincronización bidireccional:
   * 1. Detecta conexión
   * 2. Lee pendientes de la cola
   * 3. Envía operaciones al servidor (upload)
   * 4. Marca como sincronizadas las operaciones exitosas
   * 5. Descarga cambios del servidor (download)
   * 6. Aplica cambios en SQLite local (upsert/delete)
   * 7. Resuelve conflictos según la respuesta del servidor
   */
  async sincronizar({ strategy = 'last_write_wins' } = {}) {
    if (syncing) return { skipped: true, reason: 'ya_hay_una_sincronizacion_en_curso' };

    // 1. Detección de conexión
    const online = await NetworkService.isOnline();
    if (!online) return { skipped: true, reason: 'sin_conexion' };

    syncing = true;
    const resumen = { subidas: 0, conflictos: 0, descargas: 0, errores: [] };

    try {
      const deviceId = await AuthService.ensureDeviceId();

      // 2. Lee operaciones pendientes de la cola local
      const pendientes = await SyncRepository.obtenerPendientes(100);

      if (pendientes.length > 0) {
        // 3. Envía el lote al servidor
        const operations = pendientes.map(p => ({
          uuid: p.entity_uuid,
          action: p.action,
          payload: p.payload,
          client_updated_at: p.payload.client_updated_at
        }));

        const { results } = await RemoteDataSource.uploadOperations(deviceId, operations, strategy);

        // 4. Marca como sincronizadas (o registra conflicto/error) cada operación
        for (const item of results) {
          const opLocal = pendientes.find(p => p.entity_uuid === item.uuid);
          if (!opLocal) continue;

          if (item.status === 'synced') {
            // Si el servidor detectó que la cédula ya existía con otro uuid
            // (persona creada offline en otro dispositivo, o previamente
            // online), canonical_uuid trae el uuid REAL. Hay que renombrar
            // el registro local para no quedar con dos filas de la misma persona.
            if (item.canonical_uuid && item.canonical_uuid !== item.uuid) {
              await PersonaRepository.reconciliarUuidLocal(item.uuid, item.record);
            }
            await SyncRepository.marcarSincronizado(opLocal.id);
            await LocalDataSource.markSynced(item.canonical_uuid || item.uuid);
            resumen.subidas += 1;
          } else if (item.status === 'conflict_resolved_server_wins') {
            // 7. El servidor tenía la versión más reciente: se aplica localmente su versión
            if (item.canonical_uuid && item.canonical_uuid !== item.uuid) {
              await PersonaRepository.reconciliarUuidLocal(item.uuid, item.record);
            } else {
              await PersonaRepository.aplicarCambioRemoto(item.record);
            }
            await SyncRepository.marcarSincronizado(opLocal.id);
            resumen.conflictos += 1;
          } else {
            await SyncRepository.marcarError(opLocal.id, item.message || 'Error desconocido');
            resumen.errores.push({ uuid: item.uuid, mensaje: item.message });
          }
        }

        await SyncRepository.limpiarSincronizados();
      }

      // 5. Descarga cambios nuevos del servidor (incremental, según sync_state)
      const { changes, syncedAt } = await RemoteDataSource.downloadChanges(deviceId);

      // 6. Aplica los cambios descargados en SQLite local
      for (const personaRemota of changes) {
        if (personaRemota.deleted) {
          await LocalDataSource.softDeletePersona(personaRemota.uuid, personaRemota.updated_at);
        } else {
          await PersonaRepository.aplicarCambioRemoto(personaRemota);
        }
        resumen.descargas += 1;
      }

      // Confirma al servidor que se aplicaron los cambios, para avanzar el cursor de sync_state
      await RemoteDataSource.confirmSync(deviceId, syncedAt);

      return { skipped: false, ...resumen };
    } catch (err) {
      resumen.errores.push({ mensaje: err.message });
      return { skipped: false, fallo: true, ...resumen };
    } finally {
      syncing = false;
    }
  },

  // Se llama una vez al montar la app (ver App.js), engancha el listener de NetInfo
  iniciarAutoSync() {
    return NetworkService.subscribe((online) => {
      if (online) this.sincronizar();
    });
  }
};

export default SyncService;
