import { serverConfig } from '../../config';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
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

/** Whether the database answers, for the readiness check. */
export async function isDatabaseReachable(): Promise<boolean> {
    try {
        // Without a timeout a down database leaves the check hanging until the pool gives up.
        await Promise.race([
            db.execute(sql`select 1`),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), 2000)),
        ]);
        return true;
    } catch {
        return false;
    }
}

/** Closes the connection pool on shutdown. */
export async function closeDb() {
    await db.$client.end();
}

export * as schema from './schema';
export { newId } from './new-id';
