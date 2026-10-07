const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '',
  connectionTimeoutMillis: 3000,
});

pool.query('SELECT 1 as ok')
  .then(r => { console.log('CONEXION OK:', r.rows); pool.end(); })
  .catch(e => { console.log('ERROR:', e.message); pool.end(); });