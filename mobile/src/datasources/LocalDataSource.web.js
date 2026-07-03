import { getDb } from '../database/db.web';

// ---- Helpers genéricos sobre IndexedDB con Promises ----
async function tx(storeName, mode, fn) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Misma interfaz pública que LocalDataSource.js (SQLite). El resto de la app
 * (repositories/services) no sabe ni le importa cuál de las dos está usando:
 * el bundler elige este archivo automáticamente al compilar para web.
 */
const LocalDataSource = {
  // ---------- PERSONAS ----------
  async getAllPersonas() {
    const db = await getDb();
    const transaction = db.transaction('personas', 'readonly');
    const all = await requestToPromise(transaction.objectStore('personas').getAll());
    return all.filter((p) => !p.deleted).sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async getPersonaByUuid(uuid) {
    const db = await getDb();
    const transaction = db.transaction('personas', 'readonly');
    const result = await requestToPromise(transaction.objectStore('personas').get(uuid));
    return result || null;
  },

  // La cédula es la clave de identidad real de la persona (no el uuid interno).
  // Se usa antes de crear cualquier registro nuevo, offline u online.
  async getPersonaByDocumento(documento) {
    const db = await getDb();
    const transaction = db.transaction('personas', 'readonly');
    const index = transaction.objectStore('personas').index('documento');
    const result = await requestToPromise(index.get(documento));
    return result && !result.deleted ? result : null;
  },

  async upsertPersona(persona) {
    return tx('personas', 'readwrite', (store) => {
      store.put({ ...persona, deleted: persona.deleted ? 1 : 0 });
    });
  },

  async softDeletePersona(uuid, updated_at) {
    const existente = await this.getPersonaByUuid(uuid);
    if (!existente) return;
    return tx('personas', 'readwrite', (store) => {
      store.put({ ...existente, deleted: 1, updated_at, sync_status: 'PENDING' });
    });
  },

  async markSynced(uuid) {
    const existente = await this.getPersonaByUuid(uuid);
    if (!existente) return;
    return tx('personas', 'readwrite', (store) => {
      store.put({ ...existente, sync_status: 'SYNCED' });
    });
  },

  // Borrado FÍSICO interno, solo para reconciliar duplicados por documento
  // entre dispositivos (ver PersonaRepository.reconciliarUuidLocal). No usar
  // para eliminar personas normalmente: para eso existe softDeletePersona.
  async deletePersonaLocal(uuid) {
    return tx('personas', 'readwrite', (store) => {
      store.delete(uuid);
    });
  },

  // ---------- SYNC QUEUE ----------
  async enqueueOperation({ entity, entity_uuid, action, payload }) {
    return tx('sync_queue', 'readwrite', (store) => {
      store.add({
        entity,
        entity_uuid,
        action,
        payload: JSON.stringify(payload),
        status: 'PENDING',
        attempts: 0,
        created_at: new Date().toISOString()
      });
    });
  },

  async getPendingOperations(limit = 50) {
    const db = await getDb();
    const transaction = db.transaction('sync_queue', 'readonly');
    const all = await requestToPromise(transaction.objectStore('sync_queue').getAll());
    return all
      .filter((r) => r.status === 'PENDING')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, limit)
      .map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
  },

  async markOperationSynced(id) {
    const db = await getDb();
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const record = await requestToPromise(store.get(id));
    if (record) store.put({ ...record, status: 'SYNCED' });
  },

  async markOperationError(id, message) {
    const db = await getDb();
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const record = await requestToPromise(store.get(id));
    if (record) {
      store.put({ ...record, status: 'ERROR', attempts: (record.attempts || 0) + 1, last_error: message });
    }
  },

  async clearSyncedOperations() {
    const db = await getDb();
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const all = await requestToPromise(store.getAll());
    all.filter((r) => r.status === 'SYNCED').forEach((r) => store.delete(r.id));
  },

  // ---------- CONFIGURACION ----------
  async getConfig(clave) {
    const db = await getDb();
    const transaction = db.transaction('configuracion', 'readonly');
    const row = await requestToPromise(transaction.objectStore('configuracion').get(clave));
    return row ? row.valor : null;
  },

  async setConfig(clave, valor) {
    return tx('configuracion', 'readwrite', (store) => {
      store.put({ clave, valor });
    });
  }
};

export default LocalDataSource;
