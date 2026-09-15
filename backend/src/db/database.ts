import { getDb, getDbType } from './databaseConnection';
import { Pool } from 'pg';
import { exec, getOne, getAll, run, transaction, query } from './queryHelper';

export { getDb, getDbType };
export { query, getOne, getAll, run, exec, transaction };

const PG_SCHEMA_TABLES = `
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
  sku VARCHAR(100),
  pet VARCHAR(100),
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  tipo VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRADOR',
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
  cogestion VARCHAR(2) NOT NULL DEFAULT 'NO',
  inicio_gestion DATE,
  fin_gestion DATE,
  correo_soporte VARCHAR(200),
  soporte_n1 VARCHAR(2) NOT NULL DEFAULT 'NO',
  pep VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generacion_actas DATE,
  pet VARCHAR(100),
  nombre_proyecto VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS activo_administrador (
  id SERIAL PRIMARY KEY,
  activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(activo_id, usuario_id)
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
`;

const PG_SCHEMA_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos(estado);
  CREATE INDEX IF NOT EXISTS idx_activos_cliente ON activos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_activos_plataforma ON activos(plataforma_id);
  CREATE INDEX IF NOT EXISTS idx_activos_serial ON activos(serial_number);
  CREATE INDEX IF NOT EXISTS idx_activos_fin_gestion ON activos(fin_gestion);
  CREATE INDEX IF NOT EXISTS idx_historial_activo ON historial_activo(activo_id);
  CREATE INDEX IF NOT EXISTS idx_activo_admin_activo ON activo_administrador(activo_id);
  CREATE INDEX IF NOT EXISTS idx_activo_admin_usuario ON activo_administrador(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_plataformas_sku ON plataformas(sku);
  CREATE INDEX IF NOT EXISTS idx_plataformas_pet ON plataformas(pet);
`;

export async function initDatabase() {
  const pool = getDb() as Pool;
  await pool.query(PG_SCHEMA_TABLES);

  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas DATE');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet VARCHAR(100)');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200)');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pep VARCHAR(100)');
  await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puede_iniciar_sesion BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puede_ser_asignado BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query(`
    UPDATE usuarios
    SET puede_ser_asignado = TRUE
    WHERE rol = 'ADMIN'
      AND nombre IN ('Harold Carretero', 'Edwin Rincon', 'Edwin Rincón', 'Juan Cadavid', 'N2 DISPONIBLE')
  `);
  await pool.query('ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL');
  await pool.query('ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL');

  const assignmentColumn = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'activo_administrador' AND column_name = 'usuario_id'"
  );
  if (assignmentColumn.rows.length === 0) {
    await pool.query('ALTER TABLE activo_administrador ADD COLUMN usuario_id INTEGER');
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, estado, password_change_required, puede_iniciar_sesion, puede_ser_asignado)
      SELECT p.nombre, NULL, NULL, 'ADMIN', p.estado, FALSE, FALSE, TRUE
      FROM personas p
      WHERE p.nombre IN ('Harold Carretero', 'Edwin Rincon', 'Edwin Rincón', 'Juan Cadavid', 'N2 DISPONIBLE')
        AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE LOWER(u.nombre) = LOWER(p.nombre))
    `);
    await pool.query(`
      UPDATE activo_administrador aa
      SET usuario_id = u.id
      FROM personas p
      JOIN usuarios u ON LOWER(u.nombre) = LOWER(p.nombre)
      WHERE aa.persona_id = p.id
    `);
    await pool.query('DELETE FROM activo_administrador WHERE usuario_id IS NULL');
    await pool.query('ALTER TABLE activo_administrador DROP CONSTRAINT IF EXISTS activo_administrador_persona_id_fkey');
    await pool.query('ALTER TABLE activo_administrador DROP CONSTRAINT IF EXISTS activo_administrador_activo_id_persona_id_key');
    await pool.query('ALTER TABLE activo_administrador DROP COLUMN persona_id');
    await pool.query('ALTER TABLE activo_administrador ALTER COLUMN usuario_id SET NOT NULL');
    await pool.query('ALTER TABLE activo_administrador ADD CONSTRAINT activo_administrador_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE');
    await pool.query('ALTER TABLE activo_administrador ADD CONSTRAINT activo_administrador_activo_id_usuario_id_key UNIQUE (activo_id, usuario_id)');
    await pool.query('DROP TABLE IF EXISTS personas CASCADE');
  }

  await pool.query(PG_SCHEMA_INDEXES);

  const skuCol = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plataformas' AND column_name = 'sku'"
  );
  if (skuCol.rows.length === 0) {
    await pool.query('ALTER TABLE plataformas ADD COLUMN sku VARCHAR(100)');
  }

  const petCol = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plataformas' AND column_name = 'pet'"
  );
  if (petCol.rows.length === 0) {
    await pool.query('ALTER TABLE plataformas ADD COLUMN pet VARCHAR(100)');
  }

  const config = await getOne('SELECT COUNT(*) as count FROM configuracion');
  if (!config || Number(config.count) === 0) {
    await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['dias_proximo_vencer', '30']);
    await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', ['bloquear_duplicados_serial', '0']);
  }
}
