const { pool } = require('../config/db');

const historialRepository = {
  async logEvento({ persona, documento, evento, resultado, descripcion, device_id }) {
    await pool.query(
      `INSERT INTO historial (persona, documento, evento, resultado, descripcion, device_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [persona, documento, evento, resultado, descripcion, device_id || null]
    );
  },

  async getAll() {
    const [rows] = await pool.query('SELECT * FROM historial ORDER BY fecha DESC');
    return rows;
  }
};

module.exports = historialRepository;
