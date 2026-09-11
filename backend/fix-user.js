const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function resetDb() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'railway',
    user: 'postgres',
    password: 'wuDGHPWKJFrgCHvqtbzGxKELDjPfxkgm',
    max: 1
  });
  try {
    // Drop all tables to start fresh
    const drops = [
      'DROP TABLE IF EXISTS tickets_relacionados CASCADE',
      'DROP TABLE IF EXISTS historial_activo CASCADE',
      'DROP TABLE IF EXISTS historial_ticket CASCADE',
      'DROP TABLE IF EXISTS tickets CASCADE',
      'DROP TABLE IF EXISTS activos CASCADE',
      'DROP TABLE IF EXISTS clientes CASCADE',
      'DROP TABLE IF EXISTS plataformas CASCADE',
      'DROP TABLE IF EXISTS usuarios CASCADE',
      'DROP TABLE IF EXISTS configuracion CASCADE'
    ];
    for (const sql of drops) {
      await pool.query(sql);
    }
    console.log('All tables dropped');

    // Verify
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Remaining tables:', JSON.stringify(tables.rows));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetDb();
