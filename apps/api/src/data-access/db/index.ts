import { serverConfig } from '../../config';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

export function createDb(connectionString: string) {
    return drizzle(connectionString);
}

export type Database = ReturnType<typeof createDb>;

/** The `tx` handed to db.transaction() callbacks. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const db = createDb(serverConfig.DATABASE_URL);

export * as schema from './schema';