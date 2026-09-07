import path from 'node:path';
import dotenv from 'dotenv';
import { definePlugin } from "nitro";
import { parseServerConfig, type ServerConfig } from '../config';

let serverConfig: ServerConfig;
export default definePlugin(() => {
    // Only inject programmatically during local development
    console.log("INITIALIZING loadServerConfig PLUGIN")
    if (process.env.NODE_ENV !== 'production') {
        const serverEnvPath = path.resolve(process.cwd(), './src/server/.env.local');

        dotenv.config({
            path: serverEnvPath
        });

        // Optional: Log it to your terminal to ensure it's pointing to the right place
        console.log(`[Nitro] Loaded local server environment from: ${serverEnvPath}`);
    }
    serverConfig = parseServerConfig()

});

export { serverConfig }