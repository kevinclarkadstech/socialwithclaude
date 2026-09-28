import { serverConfig } from '@/server/config';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
console.log(serverConfig.DATABASE_URL)

export const db = drizzle(serverConfig.DATABASE_URL);

export * as schema from './schema';

db.$client.connect().then(client => {
    console.log('client connected');
    console.log(client.port)
}).catch(error => {
    console.log('error connecting');
    console.log(error)
});