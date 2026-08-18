/**
 * Ejecuta las migraciones de esquema (*.sql) en orden y luego aplica
 * las migraciones de código (*.js) que necesitan lógica condicional
 * (como el UNIQUE de documento, que debe ser idempotente).
 *
 * Uso: npm run migrate
 *
 * NOTA: 002_cleanup_duplicates.js NO se ejecuta automáticamente aquí a
 * propósito, porque fusiona/modifica datos existentes y requiere revisión
 * manual antes de aplicarse. Se corre aparte con:
 *   npm run cleanup:duplicates -- --apply
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = __dirname;

async function verificarUniqueDocumento(connection, dbName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'personas' AND COLUMN_NAME = 'documento' AND NON_UNIQUE = 0`,
    [dbName]
  );
  return rows[0].total > 0;
}

async function run() {
  const dbName = process.env.DB_NAME || 'sync_app';

  // 1. Migraciones de esquema base (SQL)
  const sqlFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    for (const archivo of sqlFiles) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
      try {
        await connection.query(sql);
        console.log(`✅ ${archivo} ejecutada correctamente`);
      } catch (err) {
        console.error(`\n❌ ${archivo} FALLÓ: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }
  } finally {
    await connection.end();
  }

  // 2. Migraciones condicionales (JS) — por ahora, solo el UNIQUE de documento
  const aplicarUniqueDocumento = require('./003_documento_unique');
  await aplicarUniqueDocumento();

  // 3. Verificación final explícita (no silenciosa)
  const finalConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName
  });
  try {
    const ok = await verificarUniqueDocumento(finalConn, dbName);
    if (ok) {
      console.log('\n✅ Verificado: "documento" tiene restricción UNIQUE activa en MySQL.');
    } else {
      console.warn('\n⚠️  ADVERTENCIA: "documento" NO tiene restricción UNIQUE activa todavía.');
      console.warn('    Corre: npm run cleanup:duplicates -- --apply   y luego   npm run migrate');
    }
  } finally {
    await finalConn.end();
  }
}

run().catch((err) => {
  console.error('❌ Error ejecutando migraciones:', err.message);
  process.exitCode = 1;
});
