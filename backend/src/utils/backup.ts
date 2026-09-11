import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../data/cmdb.sqlite');
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUPS = 30;

export function backupDatabase(): { success: boolean; file: string; error?: string } {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, file: '', error: 'Base de datos no encontrada' };
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFile = path.join(BACKUP_DIR, `cmdb-backup-${dateStr}.sqlite`);

    fs.copyFileSync(DB_PATH, backupFile);

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f: string) => f.startsWith('cmdb-backup-') && f.endsWith('.sqlite'))
      .sort()
      .reverse();

    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, backups[i]));
    }

    return { success: true, file: backupFile };
  } catch (error: any) {
    return { success: false, file: '', error: error.message };
  }
}
