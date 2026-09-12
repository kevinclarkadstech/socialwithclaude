import { definePlugin } from "nitro";
import { loadServerConfig } from '../config';

export default definePlugin(() => {
    // Only inject programmatically during local development
    console.log("INITIALIZING loadServerConfig PLUGIN")
    loadServerConfig();
    console.log("DONE INITIALIZING loadServerConfig PLUGIN")
});