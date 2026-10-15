
import * as Sentry from "@sentry/browser";
import { createLogger, type AppLogger } from "@myapp/shared/observability";
import { config } from "../config";

export const logger: AppLogger = createLogger({
    level: "debug",
    browser: {
        overrides: {
            info(message: string, context?: Record<string, unknown>) {
                if (config.environment !== "production") {
                    console.info(message, context);
                } else {
                    Sentry.addBreadcrumb({ message, data: context });
                }
            },
            warn(message: string, context?: Record<string, unknown>) {
                if (config.environment !== "production") {
                    console.warn(message, context);
                } else {
                    Sentry.addBreadcrumb({ message, data: context });
                }
            },
            error(message: string, context?: Record<string, unknown>) {
                if (config.environment !== "production") {
                    console.error(message, context);
                } else {
                    Sentry.logger.error(message, context);
                }
            },
            debug(message: string, context?: Record<string, unknown>) {
                if (config.environment !== "production") {
                    console.debug(message, context);
                } else {
                    Sentry.addBreadcrumb({ message, data: context });
                }
            }
        }
    }
})