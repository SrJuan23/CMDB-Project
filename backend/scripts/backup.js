const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACKUP_DIR = path.resolve(__dirname, '../backups');
const MAX_BACKUPS = 30;

function backupDatabase() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFile = path.join(BACKUP_DIR, `cmdb-backup-${dateStr}.dump`);
    const dbHost = process.env.PG_HOST || 'localhost';
    const dbPort = process.env.PG_PORT || '5432';
    const dbUser = process.env.PG_USER || 'postgres';
    const dbName = process.env.PG_DATABASE || 'cmdb_hiberus';
    const dbPassword = process.env.PG_PASSWORD || '';

    execFileSync('pg_dump', ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-Fc', '-f', backupFile], {
      env: { ...process.env, PGPASSWORD: dbPassword },
      stdio: 'inherit'
    });

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('cmdb-backup-') && f.endsWith('.dump'))
      .sort()
      .reverse();

    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, backups[i]));
    }

    return { success: true, file: backupFile };
  } catch (error) {
    return { success: false, file: '', error: error.message };
  }
}

const result = backupDatabase();
if (result.success) {
  console.log(`Backup exitoso: ${result.file}`);
  process.exit(0);
} else {
  console.error(`ERROR: ${result.error}`);
  process.exit(1);
}
