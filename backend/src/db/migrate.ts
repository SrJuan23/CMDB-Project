import { getDb } from './databaseConnection';
import { Pool } from 'pg';

/**
 * Migration script: ensures new columns/tables exist for PostgreSQL.
 * Run with: npx tsx src/db/migrate.ts
 */
export async function runMigration() {
  console.log('=== Starting TTECH CMDB Migration ===');

  const pool = getDb() as Pool;

  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas DATE');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet VARCHAR(100)');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200)');
  await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pep VARCHAR(100)');

  const skuPlatCol = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plataformas' AND column_name = 'sku'"
  );
  if (skuPlatCol.rows.length === 0) {
    await pool.query('ALTER TABLE plataformas ADD COLUMN sku VARCHAR(100)');
  }

  const petPlatCol = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plataformas' AND column_name = 'pet'"
  );
  if (petPlatCol.rows.length === 0) {
    await pool.query('ALTER TABLE plataformas ADD COLUMN pet VARCHAR(100)');
  }

  const personasCheck = await pool.query("SELECT to_regclass('personas') as exists");
  if (!personasCheck.rows[0]?.exists) {
    await pool.query(`CREATE TABLE personas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      email VARCHAR(200),
      tipo VARCHAR(20) NOT NULL DEFAULT 'ADMINISTRADOR',
      estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('Created personas table');
  }

  const adminCheck = await pool.query("SELECT to_regclass('activo_administrador') as exists");
  if (!adminCheck.rows[0]?.exists) {
    await pool.query(`CREATE TABLE activo_administrador (
      id SERIAL PRIMARY KEY,
      activo_id INTEGER NOT NULL REFERENCES activos(id) ON DELETE CASCADE ON UPDATE CASCADE,
      persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE(activo_id, persona_id)
    )`);
    console.log('Created activo_administrador table');
  }

  console.log('Migration complete.');
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('=== Migration finished ===');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
