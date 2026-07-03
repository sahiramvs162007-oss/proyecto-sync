const { pool } = require('../config/db');

const personaRepository = {
  async findByUuid(uuid) {
    const [rows] = await pool.query('SELECT * FROM personas WHERE uuid = ?', [uuid]);
    return rows[0] || null;
  },

  async findByDocumento(documento) {
    const [rows] = await pool.query('SELECT * FROM personas WHERE documento = ? AND deleted = 0', [documento]);
    return rows[0] || null;
  },

  async findAll({ includeDeleted = false } = {}) {
    const sql = includeDeleted
      ? 'SELECT * FROM personas ORDER BY updated_at DESC'
      : 'SELECT * FROM personas WHERE deleted = 0 ORDER BY updated_at DESC';
    const [rows] = await pool.query(sql);
    return rows;
  },

  // Trae solo lo que cambió después de una fecha (sincronización incremental)
  async findUpdatedSince(since) {
    const [rows] = await pool.query(
      'SELECT * FROM personas WHERE updated_at > ? ORDER BY updated_at ASC',
      [since]
    );
    return rows;
  },

  async create(persona) {
    const { uuid, documento, nombre, telefono, email, direccion, device_id } = persona;
    await pool.query(
      `INSERT INTO personas (uuid, documento, nombre, telefono, email, direccion, version, device_id, deleted)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0)`,
      [uuid, documento, nombre, telefono || null, email || null, direccion || null, device_id || null]
    );
    return this.findByUuid(uuid);
  },

  async update(uuid, persona) {
    const { documento, nombre, telefono, email, direccion, device_id } = persona;
    await pool.query(
      `UPDATE personas
       SET documento = ?, nombre = ?, telefono = ?, email = ?, direccion = ?,
           version = version + 1, device_id = ?
       WHERE uuid = ?`,
      [documento, nombre, telefono || null, email || null, direccion || null, device_id || null, uuid]
    );
    return this.findByUuid(uuid);
  },

  // Soft delete: nunca se borra físicamente para no "revivir" el registro en otro dispositivo
  async softDelete(uuid, device_id) {
    await pool.query(
      `UPDATE personas SET deleted = 1, version = version + 1, device_id = ? WHERE uuid = ?`,
      [device_id || null, uuid]
    );
    return this.findByUuid(uuid);
  }
};

module.exports = personaRepository;
