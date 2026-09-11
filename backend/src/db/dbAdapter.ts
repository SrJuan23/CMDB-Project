import { getDb, getDbType } from './databaseConnection';

export type Db = ReturnType<typeof getDb>;
export type DbType = ReturnType<typeof getDbType>;

export function getDbInstance(): Db {
  return getDb();
}

export function getCurrentDbType(): DbType {
  return getDbType();
}
