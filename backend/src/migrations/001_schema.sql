-- ============================================================
-- MIGRACIÓN INICIAL - Base de datos MySQL (Servidor)
-- Proyecto: App Offline-First con Sincronización Bidireccional
-- ============================================================

CREATE DATABASE IF NOT EXISTS sync_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sync_app;

-- ------------------------------------------------------------
-- Tabla: usuarios (autenticación del sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36)      NOT NULL UNIQUE,
  nombre        VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  rol           ENUM('admin', 'operador') NOT NULL DEFAULT 'operador',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: personas (entidad principal sincronizable)
-- El UUID es la clave de sincronización, NO el id autoincremental
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  uuid        CHAR(36)      NOT NULL UNIQUE,   -- identificador técnico interno para sincronización
  documento   VARCHAR(30)   NOT NULL UNIQUE,   -- cédula: identidad REAL de la persona en todo el sistema
  nombre      VARCHAR(150)  NOT NULL,
  telefono    VARCHAR(30)   NULL,
  email       VARCHAR(150)  NULL,
  direccion   VARCHAR(255)  NULL,
  version     INT           NOT NULL DEFAULT 1, -- para resolución de conflictos por versión
  device_id   VARCHAR(100)  NULL,               -- qué dispositivo hizo el último cambio
  deleted     TINYINT(1)    NOT NULL DEFAULT 0, -- soft delete (obligatorio en offline-first)
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_updated_at (updated_at),
  INDEX idx_deleted (deleted)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: sync_log (auditoría de cada operación sincronizada)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  entity       VARCHAR(50)   NOT NULL,          -- ej: 'personas'
  entity_uuid  CHAR(36)      NOT NULL,
  action       ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  payload      JSON          NULL,
  device_id    VARCHAR(100)  NULL,
  processed_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity_uuid (entity_uuid),
  INDEX idx_processed_at (processed_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: sync_state (control de sincronización incremental por dispositivo)
-- Esto evita descargar TODA la tabla personas en cada sync
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_state (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  device_id     VARCHAR(100)  NOT NULL UNIQUE,
  last_sync_at  DATETIME      NULL,
  last_version  INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Usuario admin de prueba (password: Admin123!)
-- El hash se genera en el seed.js con bcrypt, esto es solo referencial
-- ------------------------------------------------------------
-- INSERT INTO usuarios (uuid, nombre, email, password_hash, rol)
-- VALUES (UUID(), 'Administrador', 'admin@sync-app.com', '<bcrypt_hash>', 'admin');
