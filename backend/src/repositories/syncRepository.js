const { pool } = require('../config/db');

const syncRepository = {
  async logOperation({ entity, entity_uuid, action, payload, device_id }) {
    await pool.query(
      `INSERT INTO sync_log (entity, entity_uuid, action, payload, device_id)
       VALUES (?, ?, ?, ?, ?)`,
      [entity, entity_uuid, action, JSON.stringify(payload || {}), device_id || null]
    );
  },

  async getState(device_id) {
    const [rows] = await pool.query('SELECT * FROM sync_state WHERE device_id = ?', [device_id]);
    return rows[0] || null;
  },

  // Crea o actualiza el registro de sync_state tras una sincronización exitosa
  async upsertState(device_id, { last_sync_at, last_version }) {
    const existing = await this.getState(device_id);
    if (existing) {
      await pool.query(
        'UPDATE sync_state SET last_sync_at = ?, last_version = ? WHERE device_id = ?',
        [last_sync_at, last_version, device_id]
      );
    } else {
      await pool.query(
        'INSERT INTO sync_state (device_id, last_sync_at, last_version) VALUES (?, ?, ?)',
        [device_id, last_sync_at, last_version]
      );
    }
    return this.getState(device_id);
  }
};

module.exports = syncRepository;
