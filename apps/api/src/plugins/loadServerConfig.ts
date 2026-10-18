import { definePlugin } from "nitro";

export default definePlugin(() => {
    // Only inject programmatically during local development
    console.log("INITIALIZING loadServerConfig PLUGIN")

    console.log("DONE INITIALIZING loadServerConfig PLUGIN")
});