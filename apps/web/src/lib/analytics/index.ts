import { posthog } from "posthog-js";
import { type AnalyticsEvent } from '@myapp/shared/types';
import { config } from "../config";

export const analytics = {
    initialized: false,

    initialize: () => {
        if (analytics.initialized) return;
        console.log("Initializing analytics...");
        if (config.environment === "production") {
            posthog.init('phc_uQvX4T4wNB2FnCrQwC4LNbCA4R2ZyudB59xWXEbh2H5u', { api_host: 'https://us.i.posthog.com', defaults: '2026-05-30' });
        }
        analytics.initialized = true;
        console.log("Initialized analytics.")
    },

    track(event: AnalyticsEvent) {
        if (!analytics.initialized) return;
        if (config.environment === "production") {
            posthog.capture(event.type, event);
        } else {
            console.log(event.type, event)
        }
    }

}