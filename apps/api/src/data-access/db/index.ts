import { serverConfig } from '../../config';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

export function createDb(connectionString: string) {
    return drizzle(connectionString);
}

export type Database = ReturnType<typeof createDb>;

/** The `tx` handed to db.transaction() callbacks. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The database or a transaction: anything a query can run on. */
export type Executor = Database | Transaction;

export const db = createDb(serverConfig.DATABASE_URL);

export * as schema from './schema';
export { newId } from './new-id';
