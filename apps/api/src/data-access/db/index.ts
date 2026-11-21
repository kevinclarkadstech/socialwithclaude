import { AsyncLocalStorage } from 'node:async_hooks';
import { serverConfig } from '../../infra/config';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { relations } from './relations';

export function createDb(connectionString: string) {
    // The relations let better-auth join a session and its user in one query.
    return drizzle(connectionString, { relations });
}

export type Database = ReturnType<typeof createDb>;

/** The `tx` handed to db.transaction() callbacks. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The database or a transaction: anything a query can run on. */
export type Executor = Database | Transaction;

// The database for the request being handled, when each request has its own (see withRequestDatabase).
const requestDatabase = new AsyncLocalStorage<Database>();
let sharedDatabase: Database | undefined;

function currentDatabase(): Database {
    return requestDatabase.getStore() ?? (sharedDatabase ??= createDb(sharedDatabaseUrl()));
}

function sharedDatabaseUrl(): string {
    if (!serverConfig.DATABASE_URL) {
        throw new Error("DATABASE_URL isn't set: on Workers, the database is only reached inside a request, Cron Trigger or queue batch (withRequestDatabase)");
    }
    return serverConfig.DATABASE_URL;
}

/**
 * The database. Code uses it the same everywhere; which client it reaches
 * depends on the runtime: on a long-running server one pool shared by every
 * request (made on first use), on Workers the client of the request being
 * handled (see withRequestDatabase). Commands and tests use the shared one.
 */
export const db: Database = new Proxy({} as Database, {
    get(_target, property) {
        const database = currentDatabase();
        const value: unknown = Reflect.get(database, property, database);
        return typeof value === "function" ? value.bind(database) : value;
    },
});

/**
 * Runs `handle` with a database client of its own, closed when it's done:
 * every use of `db` inside it, however deep, reaches that client. For
 * runtimes where a connection can't outlive one request (Workers).
 */
export async function withRequestDatabase<T>({ connectionString, handle }: { connectionString: string; handle: () => Promise<T> }): Promise<T> {
    const database = createDb(connectionString);
    try {
        const result = await requestDatabase.run(database, handle);
        return result;
    } finally {
        await database.$client.end();
    }
}

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
    await sharedDatabase?.$client.end();
}

export * as schema from './schema';
export { newId } from './new-id';
