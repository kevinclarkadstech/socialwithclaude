import { definePlugin } from "nitro";
import { platform } from "#platform";

/** Sets up what the runtime needs (see Platform.setUp): on Workers, Cron Triggers and the push queue. */
export default definePlugin((nitroApp) => {
    platform.setUp?.(nitroApp);
});
