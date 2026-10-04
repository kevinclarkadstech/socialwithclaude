import { serverConfig } from '../../config';
import { defineConfig } from 'drizzle-kit';;
export default defineConfig({
    out: './drizzle',
    schema: './src/server/data-access/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: serverConfig.DATABASE_URL,
    },
});