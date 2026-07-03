import { getDb } from '../database/db';

/**
 * Fuente de datos local. Es la fuente de verdad principal de la app
 * (offline-first): la UI SIEMPRE lee/escribe aquí primero.
 */
const LocalDataSource = {
  // ---------- PERSONAS ----------
  async getAllPersonas() {
    const db = await getDb();
    return db.getAllAsync('SELECT * FROM personas WHERE deleted = 0 ORDER BY nombre ASC');
  },

  async getPersonaByUuid(uuid) {
    const db = await getDb();
    return db.getFirstAsync('SELECT * FROM personas WHERE uuid = ?', [uuid]);
  },

  // La cédula es la clave de identidad real de la persona (no el uuid interno).
  // Se usa antes de crear cualquier registro nuevo, offline u online.
  async getPersonaByDocumento(documento) {
    const db = await getDb();
    return db.getFirstAsync('SELECT * FROM personas WHERE documento = ? AND deleted = 0', [documento]);
  },

  async upsertPersona(persona) {
    const db = await getDb();
    const {
      uuid, documento, nombre, telefono, email, direccion,
      version, created_at, updated_at, deleted, sync_status
    } = persona;

    await db.runAsync(
      `INSERT INTO personas (uuid, documento, nombre, telefono, email, direccion, version, created_at, updated_at, deleted, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         documento = excluded.documento,
         nombre = excluded.nombre,
         telefono = excluded.telefono,
         email = excluded.email,
         direccion = excluded.direccion,
         version = excluded.version,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         sync_status = excluded.sync_status`,
      [
        uuid, documento, nombre, telefono || null, email || null, direccion || null,
        version || 1, created_at, updated_at, deleted ? 1 : 0, sync_status || 'PENDING'
      ]
    );
  },

  async softDeletePersona(uuid, updated_at) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE personas SET deleted = 1, updated_at = ?, sync_status = 'PENDING' WHERE uuid = ?`,
      [updated_at, uuid]
    );
  },

  async markSynced(uuid) {
    const db = await getDb();
    await db.runAsync(`UPDATE personas SET sync_status = 'SYNCED' WHERE uuid = ?`, [uuid]);
  },

  // Borrado FÍSICO interno, solo para reconciliar duplicados por documento
  // entre dispositivos (ver PersonaRepository.reconciliarUuidLocal). No usar
  // para eliminar personas normalmente: para eso existe softDeletePersona.
  async deletePersonaLocal(uuid) {
    const db = await getDb();
    await db.runAsync('DELETE FROM personas WHERE uuid = ?', [uuid]);
  },

  // ---------- SYNC QUEUE ----------
  async enqueueOperation({ entity, entity_uuid, action, payload }) {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_queue (entity, entity_uuid, action, payload, status, created_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [entity, entity_uuid, action, JSON.stringify(payload), new Date().toISOString()]
    );
  },

  async getPendingOperations(limit = 50) {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
  },

  async markOperationSynced(id) {
    const db = await getDb();
    await db.runAsync(`UPDATE sync_queue SET status = 'SYNCED' WHERE id = ?`, [id]);
  },

  async markOperationError(id, message) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'ERROR', attempts = attempts + 1, last_error = ? WHERE id = ?`,
      [message, id]
    );
  },

  async clearSyncedOperations() {
    const db = await getDb();
    await db.runAsync(`DELETE FROM sync_queue WHERE status = 'SYNCED'`);
  },

  // ---------- CONFIGURACION ----------
  async getConfig(clave) {
    const db = await getDb();
    const row = await db.getFirstAsync('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
    return row ? row.valor : null;
  },

  async setConfig(clave, valor) {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
      [clave, valor]
    );
  }
};

export default LocalDataSource;
