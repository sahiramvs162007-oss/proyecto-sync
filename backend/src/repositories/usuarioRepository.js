const { pool } = require('../config/db');

const usuarioRepository = {
  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ uuid, nombre, email, password_hash, rol }) {
    await pool.query(
      `INSERT INTO usuarios (uuid, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)`,
      [uuid, nombre, email, password_hash, rol || 'operador']
    );
    return this.findByEmail(email);
  }
};

module.exports = usuarioRepository;
