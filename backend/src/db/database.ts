import { getDb, getDbType } from './databaseConnection';
import Database from 'better-sqlite3';
import { exec, getOne, getAll, run, transaction, query } from './queryHelper';

export { getDb, getDbType };
export { query, getOne, getAll, run, exec, transaction };

export async function initDatabase() {
  if (getDbType() === 'postgres') {
    return;
  }

  exec(`
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

  exec(`
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
    const db = getDb() as Database.Database;
    const cols = db.pragma('table_info(plataformas)') as any[];
    const hasSku = cols.some((col: any) => col.name === 'sku');
    if (!hasSku) {
      exec('ALTER TABLE plataformas ADD COLUMN sku TEXT');
      exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_plataformas_sku ON plataformas(sku)');
    }
  } catch (err) {
    console.error('Error en migracion sku:', err);
  }
}
