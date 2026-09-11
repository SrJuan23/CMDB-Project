const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'railway',
    user: 'postgres',
    password: 'wuDGHPWKJFrgCHvqtbzGxKELDjPfxkgm',
    max: 1
  });
  try {
    const users = await pool.query('SELECT email, rol, nombre FROM usuarios');
    console.log('Users:', JSON.stringify(users.rows));

    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', JSON.stringify(tables.rows));

    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'plataformas' ORDER BY ordinal_position");
    console.log('Plataformas columns:', JSON.stringify(cols.rows.map(r => r.column_name)));

    const count = await pool.query('SELECT COUNT(*) as count FROM activos');
    console.log('Assets:', count.rows[0].count);
  } catch (e) {
    console.error('Error:', e);
    console.error('Stack:', e.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

check();
