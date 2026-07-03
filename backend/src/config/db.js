const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones: evita abrir/cerrar conexión en cada query,
// crítico porque el servidor recibirá ráfagas de operaciones
// cuando varias tablets sincronicen al mismo tiempo.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sync_app',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  dateStrings: true // evita problemas de timezone al comparar updated_at como string ISO
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Conexión a MySQL establecida');
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
