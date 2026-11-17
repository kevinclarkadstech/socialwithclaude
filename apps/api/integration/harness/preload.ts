/**
 * Runs once before the integration tests (bun test --preload): checks they
 * point at a throwaway database, empties it and applies the migrations.
 *
 * DATABASE_URL must be set, and the database's name must end in "_test":
 * the tests delete everything in it. Other settings the API checks at
 * startup get placeholders if they're missing (the tests don't use storage,
 * Redis or email).
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import path from "node:path";

const url = process.env.DATABASE_URL;
const databaseName = url ? new URL(url).pathname.slice(1) : "";
if (!databaseName.endsWith("_test")) {
    throw new Error(
        "The integration tests empty their database: set DATABASE_URL to one whose name ends in _test, "
        + "e.g. postgresql://postgres:postgres@localhost:5432/app_test",
    );
}

const placeholders: Record<string, string> = {
    BETTER_AUTH_SECRET: "integration-test-secret-integration-test",
    BETTER_AUTH_URL: "http://localhost:3000",
    WEB_APP_URL: "http://localhost:5173",
    STORAGE_ENDPOINT: "http://127.0.0.1:1",
    STORAGE_REGION: "test",
    STORAGE_ACCESS_KEY_ID: "test",
    STORAGE_SECRET_ACCESS_KEY: "test",
    STORAGE_UPLOADS_BUCKET: "test-uploads",
    STORAGE_MEDIA_BUCKET: "test-media",
    STORAGE_MEDIA_PUBLIC_URL: "http://127.0.0.1:1",
    REDIS_URL: "redis://127.0.0.1:1",
};
for (const [name, value] of Object.entries(placeholders)) {
    process.env[name] ??= value;
}

// A fresh schema, then every migration, as a deploy would apply them.
const db = drizzle(url!);
await db.$client.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "../../drizzle") });
await db.$client.end();
