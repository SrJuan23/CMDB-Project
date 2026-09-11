import { getDb, getDbType } from './databaseConnection';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { getOne, run } from './queryHelper';

/**
 * Migration script: removes personas/lider schema and adds new columns.
 * Run with: npx tsx src/db/migrate.ts
 */
export async function runMigration() {
  console.log('=== Starting TTECH CMDB Migration ===');

  if (getDbType() === 'postgres') {
    const pool = getDb() as Pool;

    // Check if personas table exists (indicates old schema)
    const personasCheck = await pool.query(
      "SELECT to_regclass('personas') as exists"
    );
    const hasPersonas = personasCheck.rows[0]?.exists !== null;

    if (hasPersonas) {
      console.log('Old schema detected (personas table exists). Running migration...');

      // Add new columns to activos if they don't exist
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas DATE');
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet VARCHAR(100)');
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200)');

      // Drop old tables that referenced personas
      await pool.query('DROP TABLE IF EXISTS activo_administrador CASCADE');
      await pool.query('DROP TABLE IF EXISTS personas CASCADE');

      // Drop old column if it exists
      const liderCheck = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'activos' AND column_name = 'lider_id'"
      );
      if (liderCheck.rows.length > 0) {
        await pool.query('ALTER TABLE activos DROP COLUMN IF EXISTS lider_id');
      }

      console.log('Migration complete. Personas tables dropped, new columns added.');
    } else {
      // Ensure new columns exist even on fresh deployments
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas DATE');
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet VARCHAR(100)');
      await pool.query('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200)');
      console.log('No old schema detected. New columns ensured.');
    }

    return;
  }

  // SQLite path
  const db = getDb() as Database.Database;

  const hasPersonasSqlite = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='personas'"
  ).get();

  if (hasPersonasSqlite) {
    console.log('Old schema detected (personas table exists). Running migration...');

    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas TEXT');
    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet TEXT');
    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto TEXT');

    db.exec('DROP TABLE IF EXISTS activo_administrador');
    db.exec('DROP TABLE IF EXISTS personas');

    const liderCol = db.prepare(
      "PRAGMA table_info(activos)"
    ).all().find((c: any) => c.name === 'lider_id');

    if (liderCol) {
      console.log('Note: SQLite cannot drop columns easily without table rebuild. lider_id will remain but is unused.');
    }

    console.log('SQLite migration complete.');
  } else {
    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS generacion_actas TEXT');
    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS pet TEXT');
    db.exec('ALTER TABLE activos ADD COLUMN IF NOT EXISTS nombre_proyecto TEXT');
    console.log('No old schema detected. New columns ensured.');
  }
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
