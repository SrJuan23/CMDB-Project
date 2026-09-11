import { getDb, getDbType } from './databaseConnection';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

const DB_TYPE = getDbType();

function isPostgres(): boolean {
  return DB_TYPE === 'postgres';
}

export function normalizeSql(sql: string): string {
  if (isPostgres()) {
    return sql
      .replace(/GROUP_CONCAT/g, 'STRING_AGG')
      .replace(/AUTOINCREMENT/g, 'SERIAL')
      .replace(/DATETIME/g, 'TIMESTAMP')
      .replace(/COLLATE NOCASE/g, '')
      .replace(/INSERT OR IGNORE/g, 'INSERT')
      .replace(/IF NOT EXISTS/g, '')
      .replace(/SUBSTR/g, 'SUBSTRING');
  }
  return sql;
}

export function replacePlaceholders(sql: string): string {
  if (isPostgres()) {
    return sql.replace(/\?/g, (_, i) => `$${i + 1}`);
  }
  return sql;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDb();
  const normalizedSql = normalizeSql(sql);
  
  if (isPostgres()) {
    const pgSql = replacePlaceholders(normalizedSql);
    const result = await (db as Pool).query(pgSql, params);
    return result.rows;
  } else {
    const stmt = (db as Database.Database).prepare(normalizedSql);
    return stmt.all(...params);
  }
}

export async function getOne(sql: string, params: any[] = []): Promise<any> {
  const db = getDb();
  const normalizedSql = normalizeSql(sql);
  
  if (isPostgres()) {
    const pgSql = replacePlaceholders(normalizedSql);
    const result = await (db as Pool).query(pgSql, params);
    return result.rows[0] || null;
  } else {
    const stmt = (db as Database.Database).prepare(normalizedSql);
    return (stmt.get(...params) as any) || null;
  }
}

export async function getAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDb();
  const normalizedSql = normalizeSql(sql);
  
  if (isPostgres()) {
    const pgSql = replacePlaceholders(normalizedSql);
    const result = await (db as Pool).query(pgSql, params);
    return result.rows;
  } else {
    const stmt = (db as Database.Database).prepare(normalizedSql);
    return stmt.all(...params) as any[];
  }
}

export async function run(sql: string, params: any[] = []): Promise<any> {
  const db = getDb();
  const normalizedSql = normalizeSql(sql);
  
  if (isPostgres()) {
    const pgSql = replacePlaceholders(normalizedSql);
    const result = await (db as Pool).query(pgSql, params);
    return { lastInsertRowid: result.oid ? Number(result.oid) : result.rowCount, changes: result.rowCount };
  } else {
    const stmt = (db as Database.Database).prepare(normalizedSql);
    const result = stmt.run(...params);
    return result;
  }
}

export function exec(sql: string): void {
  const db = getDb();
  
  if (isPostgres()) {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        (db as Pool).query(statement);
      }
    }
  } else {
    (db as Database.Database).exec(normalizeSql(sql));
  }
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (isPostgres()) {
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
  } else {
    const db = getDb() as Database.Database;
    const tx = db.transaction(fn);
    return tx();
  }
}
