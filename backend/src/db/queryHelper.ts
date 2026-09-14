import { getDb, getDbType } from './databaseConnection';
import { Pool } from 'pg';

const DB_TYPE = getDbType();

function isPostgres(): boolean {
  return DB_TYPE === 'postgres';
}

export function normalizeSql(sql: string): string {
  return sql
    .replace(/GROUP_CONCAT/g, 'STRING_AGG')
    .replace(/AUTOINCREMENT/g, 'SERIAL')
    .replace(/DATETIME/g, 'TIMESTAMP')
    .replace(/COLLATE NOCASE/g, '')
    .replace(/INSERT OR IGNORE/g, 'INSERT')
    .replace(/IF NOT EXISTS/g, '')
    .replace(/SUBSTR/g, 'SUBSTRING');
}

export function replacePlaceholders(sql: string): string {
  if (!isPostgres()) {
    return sql;
  }

  let counter = 0;
  return sql.replace(/\?/g, () => `$${++counter}`);
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDb() as Pool;
  const normalizedSql = normalizeSql(sql);
  const pgSql = replacePlaceholders(normalizedSql);
  const result = await db.query(pgSql, params);
  return result.rows;
}

export async function getOne(sql: string, params: any[] = []): Promise<any> {
  const db = getDb() as Pool;
  const normalizedSql = normalizeSql(sql);
  const pgSql = replacePlaceholders(normalizedSql);
  const result = await db.query(pgSql, params);
  return result.rows[0] || null;
}

export async function getAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDb() as Pool;
  const normalizedSql = normalizeSql(sql);
  const pgSql = replacePlaceholders(normalizedSql);
  const result = await db.query(pgSql, params);
  return result.rows;
}

export async function run(sql: string, params: any[] = []): Promise<any> {
  const db = getDb() as Pool;
  const normalizedSql = normalizeSql(sql);
  let pgSql = replacePlaceholders(normalizedSql);

  const trimmed = pgSql.trim().toUpperCase();
  if (trimmed.startsWith('INSERT') && !trimmed.includes('RETURNING')) {
    const tableMatch = pgSql.match(/INSERT\s+INTO\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1].toLowerCase() : '';
    const hasIdColumn = tableName !== 'configuracion';
    const returningCol = hasIdColumn ? 'id' : 'clave';
    pgSql = pgSql.replace(/;?\s*$/, '') + ` RETURNING ${returningCol}`;
  }

  const result = await db.query(pgSql, params);
  const row = result.rows?.[0];

  if (row && row.id != null) {
    return { lastInsertRowid: Number(row.id), changes: result.rowCount };
  }
  if (row && row.clave != null) {
    return { lastInsertRowid: row.clave, changes: result.rowCount };
  }
  return { lastInsertRowid: result.oid ? Number(result.oid) : result.rowCount, changes: result.rowCount };
}

export function exec(sql: string): void {
  const db = getDb() as Pool;
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      void db.query(statement);
    }
  }
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = getDb() as Pool;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
