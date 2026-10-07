const { Pool } = require('pg');
require('dotenv').config();

async function check() {
  const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'cmdb_hiberus',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    max: 1,
    connectionTimeoutMillis: 5000
  });

  try {
    const db = await pool.query('SELECT current_database() AS db, version() AS version');
    console.log('Base de datos:', db.rows[0].db);
    console.log('Servidor:', db.rows[0].version.split(',')[0]);

    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('\nTablas:', tables.rows.map(t => t.table_name).join(', ') || '(ninguna)');

    for (const t of ['activos', 'clientes', 'plataformas', 'usuarios', 'activo_administrador', 'historial_activo']) {
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`  ${t}: ${r.rows[0].n}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

check();