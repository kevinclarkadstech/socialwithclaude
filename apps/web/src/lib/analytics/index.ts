import { posthog } from "posthog-js";
import { type AnalyticsEvent } from '@myapp/shared/types';

export const analytics = {
    initialized: false,

    initialize: () => {
        if (analytics.initialized) return;
        console.log("Initializing analytics...");

        posthog.init('phc_uQvX4T4wNB2FnCrQwC4LNbCA4R2ZyudB59xWXEbh2H5u', { api_host: 'https://us.i.posthog.com', defaults: '2026-05-30' });
        analytics.initialized = true;
    },

    track(event: AnalyticsEvent) {
        if (!analytics.initialized) return;
        posthog.capture(event.type, event);
    }

}