import { loadServerConfig, getServerConfig } from '@/server/config';
import { defineConfig } from 'drizzle-kit';
loadServerConfig();
export default defineConfig({
    out: './drizzle',
    schema: './src/server/data-access/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: getServerConfig().DATABASE_URL,
    },
});