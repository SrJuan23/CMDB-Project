import { initDatabase } from './database';

/**
 * Migration script: ensures new columns/tables exist for PostgreSQL.
 * Run with: npx tsx src/db/migrate.ts
 */
export async function runMigration() {
  console.log('=== Starting Hiberus CMDB Migration ===');

  await initDatabase();
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
