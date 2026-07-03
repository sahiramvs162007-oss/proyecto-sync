-- ============================================================
-- ESQUEMA SQLite - Base de datos local (Tablet)
-- ============================================================

-- Tabla principal: personas (espejo de la tabla del servidor + control de sync)
CREATE TABLE IF NOT EXISTS personas (
  uuid        TEXT PRIMARY KEY,       -- generado con uuid v4 en el dispositivo
  documento   TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  direccion   TEXT,
  version     INTEGER DEFAULT 1,
  created_at  TEXT NOT NULL,          -- ISO string
  updated_at  TEXT NOT NULL,          -- ISO string, clave para resolución de conflictos
  deleted     INTEGER DEFAULT 0,      -- 0/1, soft delete
  sync_status TEXT DEFAULT 'PENDING'  -- PENDING | SYNCED | ERROR
);

CREATE INDEX IF NOT EXISTS idx_personas_sync_status ON personas (sync_status);
CREATE INDEX IF NOT EXISTS idx_personas_documento ON personas (documento);

-- Cola de operaciones pendientes de sincronizar
CREATE TABLE IF NOT EXISTS sync_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity        TEXT NOT NULL,         -- 'personas'
  entity_uuid   TEXT NOT NULL,
  action        TEXT NOT NULL,         -- INSERT | UPDATE | DELETE
  payload       TEXT NOT NULL,         -- JSON serializado
  status        TEXT DEFAULT 'PENDING',-- PENDING | SYNCED | ERROR
  attempts      INTEGER DEFAULT 0,
  last_error    TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);

-- Cache local de usuario autenticado (para poder abrir la app offline)
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid          TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  rol           TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Configuración clave-valor (última sync, device_id, preferencias)
CREATE TABLE IF NOT EXISTS configuracion (
  clave  TEXT PRIMARY KEY,
  valor  TEXT
);
