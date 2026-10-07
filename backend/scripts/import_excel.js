const { Pool, Client } = require('pg');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const EXCEL_PATH = process.argv[2] || 'C:\\Users\\AnaMaríaGarzónCortés\\Downloads\\CMDB Soporte.xlsx';
const PG = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || ''
};
const DB_NAME = process.env.PG_DATABASE || 'cmdb_hiberus';

const clean = v => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());

function stripHyperlink(v) {
  let s = clean(v);
  s = s.replace(/\s*\(https?:\/\/[^)]*\)\s*/gi, ' ');
  s = s.replace(/\s*\(mailto:[^)]*\)\s*/gi, ' ');
  return clean(s);
}

function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = clean(val).toUpperCase();
  if (!s || s === 'N/A' || s === '-') return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normSI(v) {
  const s = clean(v).toUpperCase();
  if (s.startsWith('SI') || s === 'S' || s === 'TRUE' || s === '1') return 'SI';
  return 'NO';
}

async function ensureDatabase() {
  const c = new Client({ ...PG, database: 'postgres', connectionTimeoutMillis: 5000 });
  await c.connect();
  const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
  if (r.rowCount === 0) {
    await c.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`Base de datos "${DB_NAME}" creada.`);
  } else {
    console.log(`Base de datos "${DB_NAME}" ya existe.`);
  }
  await c.end();
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  password_hash VARCHAR(255),
  rol VARCHAR(20) NOT NULL DEFAULT 'GESTOR',
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  password_change_required BOOLEAN NOT NULL DEFAULT FALSE,
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

async function createSchema(pool) {
  await pool.query(SCHEMA);
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet VARCHAR(100)');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas DATE');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200)');
  const cfg = await pool.query('SELECT COUNT(*)::int AS n FROM configuracion');
  if (cfg.rows[0].n === 0) {
    await pool.query("INSERT INTO configuracion (clave, valor) VALUES ('dias_proximo_vencer', '30'), ('bloquear_duplicados_serial', '0')");
  }
  console.log('Schema verificado/creado.');
}

async function seedUsers(pool) {
  const n = await pool.query('SELECT COUNT(*)::int AS n FROM usuarios');
  if (n.rows[0].n > 0) {
    console.log('Usuarios ya existentes, no se crea seed.');
    return;
  }
  const hash = p => bcrypt.hashSync(p, 10);
  const users = [
    ['Administrador General', 'admin@hiberus.com', hash('Admin123!*'), 'ADMIN', true, true],
    ['Gestor Hiberus', 'gestor@hiberus.com', hash('Gestor123!*'), 'GESTOR', true, true],
    ['Consulta CMDB', 'consulta@hiberus.com', hash('Consulta123!*'), 'CONSULTA', true, false]
  ];
  for (const [nombre, email, pw, rol, login, asignado] of users) {
    const exists = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    if (exists.rowCount > 0) continue;
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, password_change_required, puede_iniciar_sesion, puede_ser_asignado)
       VALUES ($1,$2,$3,$4,FALSE,$5,$6)`,
      [nombre, email, pw, rol, login, asignado]
    );
  }
  console.log('Usuarios base creados.');
}

function readRows(file) {
  const wb = xlsx.readFile(file, { cellDates: false });
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { defval: '' });
    const isInactivo = sheetName.toUpperCase().includes('INACTIV');
    const headers = data.length ? Object.keys(data[0]) : [];
    const find = (row, ...cands) => {
      for (const c of cands) {
        const hit = headers.find(h => clean(h).toLowerCase() === clean(c).toLowerCase());
        if (hit && row[hit] !== undefined && row[hit] !== null && row[hit] !== '') return row[hit];
      }
      return '';
    };
    data.forEach((row, i) => {
      const cliente = clean(find(row, 'Cliente', 'Empresa'));
      const hostname = clean(find(row, 'Hostname', 'Nombre Equipo', 'Host'));
      const serial = clean(find(row, 'Serial Number', 'Serial', 'Numero de Serie'));
      if (!cliente && !hostname && !serial) return;
      const admins = clean(find(row, 'Administrador(s)', 'Administrador', 'Admins'))
        .split(/\s*[/,;]\s*/).map(s => s.trim()).filter(s => s && s.toUpperCase() !== 'N/A');
      rows.push({
        cliente,
        hostname: hostname || 'SIN HOSTNAME',
        serial_number: serial || 'S/N',
        plataforma: clean(find(row, 'Platform', 'Plataforma', 'Tecnologia')) || 'GENERAL',
        ip_url_gestion: stripHyperlink(find(row, 'IP/Url Gestión', 'IP/Url Gestion', 'IP', 'URL')) || 'N/A',
        correo_soporte: stripHyperlink(find(row, 'Correo Perteneciente', 'Correo Soporte', 'Correo', 'Email')),
        lider: clean(find(row, 'Lider', 'Líder')),
        admins,
        cogestion: normSI(find(row, 'Cogestión', 'Cogestion')),
        soporte_n1: normSI(find(row, 'Damos Soporte N1 ¿?', 'Soporte N1')),
        inicio_gestion: parseDate(find(row, 'Inicio Gestion', 'Inicio de Gestion', 'Fecha Inicio')),
        fin_gestion: parseDate(find(row, 'Fin Gestion', 'Fin de Gestion', 'Fecha Fin')),
        pep: clean(find(row, 'PEP', 'Codigo PEP')),
        nombre_proyecto: clean(find(row, 'Nombre del Proyecto', 'Proyecto')),
        pet: clean(find(row, 'PET')),
        generacion_actas: parseDate(find(row, 'Generación Actas', 'Generacion Actas')),
        estado: isInactivo ? 'INACTIVO' : 'ACTIVO',
        sheet_name: sheetName,
        row_number: i + 2
      });
    });
    console.log(`Hoja "${sheetName}": ${data.length} filas`);
  }
  return rows;
}

async function getOrCreateCliente(pool, nombre) {
  const r = await pool.query('SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER($1)', [nombre]);
  if (r.rows[0]) return r.rows[0].id;
  const ins = await pool.query('INSERT INTO clientes (nombre, estado) VALUES ($1,$2) RETURNING id', [nombre, 'ACTIVO']);
  return ins.rows[0].id;
}

async function getOrCreatePlataforma(pool, nombre) {
  const r = await pool.query('SELECT id FROM plataformas WHERE LOWER(TRIM(nombre)) = LOWER($1)', [nombre]);
  if (r.rows[0]) return r.rows[0].id;
  const ins = await pool.query('INSERT INTO plataformas (nombre, estado) VALUES ($1,$2) RETURNING id', [nombre, 'ACTIVO']);
  return ins.rows[0].id;
}

async function getOrCreateUsuario(pool, nombre) {
  if (!nombre || nombre.toUpperCase() === 'N/A') return null;
  const r = await pool.query('SELECT id FROM usuarios WHERE LOWER(TRIM(nombre)) = LOWER($1)', [nombre]);
  if (r.rows[0]) return r.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO usuarios (nombre, rol, estado, password_change_required, puede_iniciar_sesion, puede_ser_asignado)
     VALUES ($1,'ADMIN','ACTIVO',FALSE,FALSE,TRUE) RETURNING id`,
    [nombre]
  );
  return ins.rows[0].id;
}

async function main() {
  await ensureDatabase();
  const pool = new Pool({ ...PG, database: DB_NAME, max: 5, connectionTimeoutMillis: 5000 });
  await createSchema(pool);
  await seedUsers(pool);

  const rows = readRows(EXCEL_PATH);
  console.log(`Total filas a importar: ${rows.length}`);

  let inserted = 0, updated = 0;
  const errors = [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    let seq = (await client.query("SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS INTEGER)), 0) AS n FROM activos WHERE codigo LIKE 'ACT-%'")).rows[0].n;
    const cacheCliente = new Map();
    const cachePlataforma = new Map();
    const cacheUsuario = new Map();

    const clienteId = async n => {
      const k = n.toLowerCase();
      if (!cacheCliente.has(k)) cacheCliente.set(k, await getOrCreateCliente(client, n));
      return cacheCliente.get(k);
    };
    const plataformaId = async n => {
      const k = n.toLowerCase();
      if (!cachePlataforma.has(k)) cachePlataforma.set(k, await getOrCreatePlataforma(client, n));
      return cachePlataforma.get(k);
    };
    const usuarioId = async n => {
      const k = n.toLowerCase();
      if (!cacheUsuario.has(k)) cacheUsuario.set(k, await getOrCreateUsuario(client, n));
      return cacheUsuario.get(k);
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const sp = `sp_${i}`;
      await client.query(`SAVEPOINT ${sp}`);
      try {
        const cid = await clienteId(r.cliente || 'CLIENTE SIN ASIGNAR');
        const pid = await plataformaId(r.plataforma);
        const key = r.serial_number.toLowerCase();

        const existing = (await client.query('SELECT id FROM activos WHERE LOWER(TRIM(serial_number)) = $1', [r.serial_number])).rows[0];
        let activoId;

        if (existing) {
          await client.query(
            `UPDATE activos SET cliente_id=$1, hostname=$2, plataforma_id=$3, ip_url_gestion=$4,
               cogestion=$5, inicio_gestion=$6, fin_gestion=$7, correo_soporte=$8, soporte_n1=$9,
               pep=$10, estado=$11, updated_at=CURRENT_TIMESTAMP WHERE id=$12`,
            [cid, r.hostname, pid, r.ip_url_gestion, r.cogestion, r.inicio_gestion, r.fin_gestion,
             r.correo_soporte || null, r.soporte_n1, r.pep || null, r.estado, existing.id]
          );
          activoId = existing.id;
          updated++;
        } else {
          seq += 1;
          const codigo = `ACT-${String(seq).padStart(6, '0')}`;
          const ins = await client.query(
            `INSERT INTO activos (codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
               generacion_actas, pet, nombre_proyecto, cogestion, inicio_gestion, fin_gestion,
               correo_soporte, soporte_n1, pep, estado, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,CURRENT_TIMESTAMP) RETURNING id`,
            [codigo, cid, r.hostname, r.serial_number, pid, r.ip_url_gestion, r.generacion_actas,
             r.pet || null, r.nombre_proyecto || null, r.cogestion, r.inicio_gestion, r.fin_gestion,
             r.correo_soporte || null, r.soporte_n1, r.pep || null, r.estado]
          );
          activoId = ins.rows[0].id;
          inserted++;
          await client.query(
            `INSERT INTO historial_activo (activo_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
             VALUES ($1, 'Sistema / Importación Excel', 'Creación', NULL, $2)`,
            [activoId, `Creado desde ${r.sheet_name} fila ${r.row_number}`]
          );
        }

        const personas = new Set();
        if (r.lider) personas.add(r.lider);
        r.admins.forEach(a => personas.add(a));
        for (const nombre of personas) {
          const uid = await usuarioId(nombre);
          if (uid) {
            await client.query(
              'INSERT INTO activo_administrador (activo_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
              [activoId, uid]
            );
          }
        }
      } catch (e) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        errors.push(`Fila ${r.row_number} (${r.serial_number}): ${e.message}`);
      }
      await client.query(`RELEASE SAVEPOINT ${sp}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Importación fallida:', e.message);
    await client.end();
    process.exit(1);
  } finally {
    client.release();
  }

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM activos)::int AS activos,
      (SELECT COUNT(*) FROM clientes)::int AS clientes,
      (SELECT COUNT(*) FROM plataformas)::int AS plataformas,
      (SELECT COUNT(*) FROM usuarios)::int AS usuarios,
      (SELECT COUNT(*) FROM activo_administrador)::int AS asignaciones,
      (SELECT COUNT(*) FROM historial_activo)::int AS historial
  `);
  console.log('\n--- Resultado ---');
  console.log(`Insertados: ${inserted} | Actualizados: ${updated} | Errores: ${errors.length}`);
  console.log('Totales en BD:', JSON.stringify(counts.rows[0]));
  if (errors.length) {
    console.log('\nErrores (max 20):');
    errors.slice(0, 20).forEach(e => console.log(' -', e));
  }
  await pool.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });