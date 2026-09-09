import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'cmdb.sqlite');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for maximum performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE COLLATE NOCASE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'GESTOR', -- 'ADMIN', 'GESTOR', 'CONSULTA'
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
      descripcion TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE COLLATE NOCASE NOT NULL,
      email TEXT,
      tipo TEXT NOT NULL DEFAULT 'AMBOS', -- 'LIDER', 'ADMINISTRADOR', 'AMBOS'
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
      cogestion TEXT NOT NULL DEFAULT 'NO', -- 'SI', 'NO'
      inicio_gestion TEXT, -- YYYY-MM-DD
      fin_gestion TEXT,    -- YYYY-MM-DD
      correo_soporte TEXT,
      soporte_n1 TEXT NOT NULL DEFAULT 'NO', -- 'SI', 'NO'
      pep TEXT,
      estado TEXT NOT NULL DEFAULT 'ACTIVO', -- 'ACTIVO', 'INACTIVO'
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

    -- Indexes for fast searches and filtering
    CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
    CREATE INDEX IF NOT EXISTS idx_activos_cliente ON activos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_activos_plataforma ON activos(plataforma_id);
    CREATE INDEX IF NOT EXISTS idx_activos_lider ON activos(lider_id);
    CREATE INDEX IF NOT EXISTS idx_activos_serial ON activos(serial_number);
    CREATE INDEX IF NOT EXISTS idx_activos_fin_gestion ON activos(fin_gestion);
    CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_activo(activo_id);
  `);

  // Trigger para actualizar `updated_at` automáticamente en cada UPDATE de activos
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_activos_timestamp
    AFTER UPDATE ON activos
    FOR EACH ROW
    BEGIN
      UPDATE activos SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  // Initialize default configuration if not set
  const checkConfig = db.prepare('SELECT COUNT(*) as count FROM configuracion').get() as { count: number };
  if (checkConfig.count === 0) {
    const insertConfig = db.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?)');
    insertConfig.run('dias_proximo_vencer', '30');
    insertConfig.run('bloquear_duplicados_serial', '0'); // 0 = allow with warning, 1 = strict block
  }
}
