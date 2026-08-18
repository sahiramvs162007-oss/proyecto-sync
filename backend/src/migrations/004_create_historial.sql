-- ------------------------------------------------------------
-- Tabla: historial (bitácora de auditoría de negocio)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  persona VARCHAR(150) NOT NULL,
  documento VARCHAR(30) NOT NULL,
  evento VARCHAR(100) NOT NULL,
  resultado VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  device_id VARCHAR(100) NULL,
  INDEX idx_documento (documento),
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB;
