import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_TYPE = 'postgres';
let pgPool: Pool | null = null;

const connectionString = process.env.DATABASE_URL;

if (connectionString) {
  pgPool = new Pool({ connectionString, max: 20 });
} else {
  pgPool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'cmdb_hiberus',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
}

export function getDbType(): string {
  return DB_TYPE;
}

export function getDb() {
  if (!pgPool) {
    throw new Error('No se inicializó el pool de PostgreSQL');
  }
  return pgPool;
}
