import { getDb, getDbType } from './databaseConnection';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { exec, getOne, getAll, run, transaction, query } from './queryHelper';

export { getDb, getDbType };
export { query, getOne, getAll, run, exec, transaction };

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'GESTOR',
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
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

CREATE TABLE IF NOT EXISTS personas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) UNIQUE NOT NULL,
  email VARCHAR(150),
  tipo VARCHAR(20) NOT NULL DEFAULT 'AMBOS',
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
  lider_id INTEGER REFERENCES personas(id) ON DELETE SET NULL ON UPDATE CASCADE,
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

CREATE TABLE IF NOT EXISTS activo_administrador (
  activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (activo_id, persona_id)
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
CREATE INDEX IF NOT EXISTS idx_activos_lider ON activos(lider_id);
CREATE INDEX IF NOT EXISTS idx_activos_serial ON activos(serial_number);
CREATE INDEX IF NOT EXISTS idx_activos_fin_gestion ON activos(fin_gestion);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_activo(activo_id);
CREATE INDEX IF NOT EXISTS idx_plataformas_sku ON plataformas(sku);
`;

export async function initDatabase() {
  if (getDbType() === 'postgres') {
    const pool = getDb() as Pool;
    await pool.query(PG_SCHEMA);

    const config = await getOne('SELECT COUNT(*) as count FROM configuracion');
    if (!config || Number(config.count) === 0) {
      await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['dias_proximo_vencer', '30']);
      await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['bloquear_duplicados_serial', '0']);
    }
    return;
  }

  const db = getDb() as Database.Database;
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE COLLATE NOCASE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'GESTOR',
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE COLLATE NOCASE NOT NULL,
      contacto TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plataformas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE COLLATE NOCASE NOT NULL,
      sku TEXT UNIQUE COLLATE NOCASE,
      descripcion TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE COLLATE NOCASE NOT NULL,
      email TEXT,
      tipo TEXT NOT NULL DEFAULT 'AMBOS',
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      hostname TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      plataforma_id INTEGER NOT NULL REFERENCES plataformas(id),
      ip_url_gestion TEXT NOT NULL,
      lider_id INTEGER REFERENCES personas(id),
      cogestion TEXT NOT NULL DEFAULT 'NO',
      inicio_gestion TEXT,
      fin_gestion TEXT,
      correo_soporte TEXT,
      soporte_n1 TEXT NOT NULL DEFAULT 'NO',
      pep TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activo_administrador (
      activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
      persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
      PRIMARY KEY (activo_id, persona_id)
    );

    CREATE TABLE IF NOT EXISTS historial_activo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id),
      usuario_nombre TEXT NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets_relacionados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
      ticket_codigo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'ABIERTO',
      prioridad TEXT DEFAULT 'MEDIA',
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
    CREATE INDEX IF NOT EXISTS idx_activos_cliente ON activos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_activos_plataforma ON activos(plataforma_id);
    CREATE INDEX IF NOT EXISTS idx_activos_lider ON activos(lider_id);
    CREATE INDEX IF NOT EXISTS idx_activos_serial ON activos(serial_number);
    CREATE INDEX IF NOT EXISTS idx_activos_fin_gestion ON activos(fin_gestion);
    CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_activo(activo_id);
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_activos_timestamp
    AFTER UPDATE ON activos
    FOR EACH ROW
    BEGIN
      UPDATE activos SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  const checkConfig = await getOne('SELECT COUNT(*) as count FROM configuracion');
  if (!checkConfig || checkConfig.count === 0) {
    await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['dias_proximo_vencer', '30']);
    await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['bloquear_duplicados_serial', '0']);
  }

  try {
    const cols = db.pragma('table_info(plataformas)') as any[];
    const hasSku = cols.some((col: any) => col.name === 'sku');
    if (!hasSku) {
      db.exec('ALTER TABLE plataformas ADD COLUMN sku TEXT');
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_plataformas_sku ON plataformas(sku)');
    }
  } catch (err) {
    console.error('Error en migracion sku:', err);
  }
}
