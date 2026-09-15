-- Hiberus CMDB - PostgreSQL Schema
-- Schema is auto-created by initDatabase() in database.ts
-- This file is kept for reference/manual setup

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),
  rol VARCHAR(20) NOT NULL DEFAULT 'GESTOR',
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  password_change_required BOOLEAN NOT NULL DEFAULT TRUE,
  puede_iniciar_sesion BOOLEAN NOT NULL DEFAULT TRUE,
  puede_ser_asignado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) UNIQUE NOT NULL,
  contacto VARCHAR(200),
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plataformas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) UNIQUE NOT NULL,
  sku VARCHAR(100) UNIQUE,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON UPDATE CASCADE,
  hostname VARCHAR(200) NOT NULL,
  serial_number VARCHAR(150) NOT NULL,
  plataforma_id INTEGER NOT NULL REFERENCES plataformas(id) ON UPDATE CASCADE,
  ip_url_gestion TEXT NOT NULL,
  generacion_actas DATE,
  pet VARCHAR(100),
  nombre_proyecto VARCHAR(200),
  cogestion VARCHAR(2) NOT NULL DEFAULT 'NO',
  inicio_gestion DATE,
  fin_gestion DATE,
  correo_soporte VARCHAR(200),
  soporte_n1 VARCHAR(2) NOT NULL DEFAULT 'NO',
  pep VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_activo (
  id SERIAL PRIMARY KEY,
  activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
  usuario_nombre VARCHAR(150) NOT NULL,
  campo VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(50) PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets_relacionados (
  id SERIAL PRIMARY KEY,
  activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  ticket_codigo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'ABIERTO',
  prioridad VARCHAR(50) DEFAULT 'MEDIA',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
CREATE INDEX IF NOT EXISTS idx_activos_cliente ON activos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_activos_plataforma ON activos(plataforma_id);
CREATE INDEX IF NOT EXISTS idx_activos_serial ON activos(serial_number);
CREATE INDEX IF NOT EXISTS idx_activos_fin_gestion ON activos(fin_gestion);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_activo(activo_id);
CREATE INDEX IF NOT EXISTS idx_plataformas_sku ON plataformas(sku);
