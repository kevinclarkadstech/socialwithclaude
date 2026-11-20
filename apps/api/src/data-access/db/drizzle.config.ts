import { serverConfig } from '../../config';
import { defineConfig } from 'drizzle-kit';

if (!serverConfig.DATABASE_URL) {
    throw new Error("Set DATABASE_URL to the database to migrate (on Neon, its direct connection string, not Hyperdrive's)");
}

export default defineConfig({
    out: './drizzle',
    schema: './src/data-access/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: serverConfig.DATABASE_URL,
    },
});