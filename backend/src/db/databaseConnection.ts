import { Pool } from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_TYPE = (process.env.DB_TYPE || 'sqlite') as 'sqlite' | 'postgres';
let sqliteDb: Database.Database | null = null;
let pgPool: Pool | null = null;

if (DB_TYPE === 'postgres') {
  const connectionString = process.env.DATABASE_URL;
  
  if (connectionString) {
    pgPool = new Pool({ connectionString, max: 20 });
  } else {
    pgPool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'cmdb_ttech',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
} else {
  const dbDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.resolve(dbDir, 'cmdb.sqlite');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

export function getDbType(): string {
  return DB_TYPE;
}

export function getDb() {
  if (DB_TYPE === 'postgres') {
    return pgPool!;
  }
  return sqliteDb!;
}
