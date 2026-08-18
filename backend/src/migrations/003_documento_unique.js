/**
 * Aplica el UNIQUE sobre documento de forma idempotente:
 * - Si ya existe el UNIQUE, no hace nada.
 * - Si existe el índice normal viejo (idx_documento), lo reemplaza.
 * - Si hay documentos duplicados, falla con un mensaje claro indicando
 *   correr primero: npm run cleanup:duplicates -- --apply
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const dbName = process.env.DB_NAME || 'sync_app';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName
  });

  try {
    const [uniqueRows] = await connection.query(
      `SELECT COUNT(*) as total FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'personas' AND COLUMN_NAME = 'documento' AND NON_UNIQUE = 0`,
      [dbName]
    );
    if (uniqueRows[0].total > 0) {
      console.log('✅ 003_documento_unique: ya estaba aplicado, no se hace nada.');
      return true;
    }

    const [oldIndexRows] = await connection.query(
      `SELECT COUNT(*) as total FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'personas' AND INDEX_NAME = 'idx_documento'`,
      [dbName]
    );
    if (oldIndexRows[0].total > 0) {
      await connection.query('ALTER TABLE personas DROP INDEX idx_documento');
    }

    await connection.query('ALTER TABLE personas ADD UNIQUE INDEX idx_documento_unique (documento)');
    console.log('✅ 003_documento_unique: UNIQUE aplicado correctamente.');
    return true;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error('❌ 003_documento_unique FALLÓ: hay documentos duplicados en la tabla personas.');
      console.error('   Corre primero:  npm run cleanup:duplicates -- --apply');
      console.error('   Y luego vuelve a correr:  npm run migrate');
      return false;
    }
    throw err;
  } finally {
    await connection.end();
  }
}

module.exports = main;

// Permite seguir corriéndolo directo: node src/migrations/003_documento_unique.js
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Error en 003_documento_unique:', err.message);
    process.exitCode = 1;
  });
}
