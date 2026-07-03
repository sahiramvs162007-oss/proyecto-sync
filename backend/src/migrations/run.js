/**
 * Ejecuta el archivo 001_schema.sql contra MySQL.
 * Uso: npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '001_schema.sql'), 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    await connection.query(sql);
    console.log('✅ Migración ejecutada correctamente');
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
})();
