import * as SQLite from 'expo-sqlite';

// Se usa expo-sqlite (API asíncrona). Si el proyecto no usa Expo,
// sustituir por 'react-native-sqlite-storage' manteniendo la misma interfaz.
let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('sync_app.db');
  return dbInstance;
}

/**
 * Ejecuta el schema.sql completo. Debe llamarse una vez al iniciar la app
 * (ver App.js). Usa execAsync porque el schema trae varias sentencias.
 */
export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS personas (
      uuid        TEXT PRIMARY KEY,
      documento   TEXT NOT NULL,
      nombre      TEXT NOT NULL,
      telefono    TEXT,
      email       TEXT,
      direccion   TEXT,
      version     INTEGER DEFAULT 1,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      deleted     INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'PENDING'
    );
    CREATE INDEX IF NOT EXISTS idx_personas_sync_status ON personas (sync_status);
    CREATE INDEX IF NOT EXISTS idx_personas_documento ON personas (documento);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      entity        TEXT NOT NULL,
      entity_uuid   TEXT NOT NULL,
      action        TEXT NOT NULL,
      payload       TEXT NOT NULL,
      status        TEXT DEFAULT 'PENDING',
      attempts      INTEGER DEFAULT 0,
      last_error    TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);

    CREATE TABLE IF NOT EXISTS usuarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid          TEXT NOT NULL,
      nombre        TEXT NOT NULL,
      email         TEXT NOT NULL,
      rol           TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave  TEXT PRIMARY KEY,
      valor  TEXT
    );

    CREATE TABLE IF NOT EXISTS historial (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid          TEXT UNIQUE NOT NULL,
      fecha         TEXT NOT NULL,
      persona       TEXT NOT NULL,
      documento     TEXT NOT NULL,
      evento        TEXT NOT NULL,
      resultado     TEXT NOT NULL,
      descripcion   TEXT NOT NULL,
      sync_status   TEXT DEFAULT 'PENDING'
    );
    CREATE INDEX IF NOT EXISTS idx_historial_sync_status ON historial (sync_status);
  `);
  console.log('✅ Base de datos local inicializada');
  return db;
}
