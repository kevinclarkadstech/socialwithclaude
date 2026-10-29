import pino from "pino";

export interface LogErrorContext extends Record<string, unknown> {
    /** Root cause explanation. */
    why?: string;
    /** Actionable next step for whoever hits this. */
    fix?: string;
    /** Docs/reference URL. */
    link?: string;
}

export interface AppLogger {
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: LogErrorContext): void;
    debug(message: string, context?: Record<string, unknown>): void;
    child(bindings: Record<string, unknown>): AppLogger;
    setBindings(bindings: Record<string, unknown>): void;
}

// Wraps Pino with a message-first API instead of Pino's own
// (mergingObject, message) shape, so call sites and the AppLogger type
// don't depend on Pino's typings.
function wrapPinoLogger(pinoLogger: pino.Logger): AppLogger {
    return {
        info(message, context) {
            pinoLogger.info(context ?? {}, message);
        },
        warn(message, context) {
            pinoLogger.warn(context ?? {}, message);
        },
        error(message, context) {
            pinoLogger.error(context ?? {}, message);
        },
        debug(message, context) {
            pinoLogger.debug(context ?? {}, message);
        },
        child(bindings) {
            return wrapPinoLogger(pinoLogger.child(bindings));
        },
        setBindings(bindings) {
            pinoLogger.setBindings(bindings);
        },
    };
}

export function createLogger({ level, destinationStream, injectAdditionalProperties, browser }: {
    level?: "info" | "fatal" | "error" | "warn" | "debug" | "trace",
    destinationStream?: {
        write(msg: string): void;
    },
    injectAdditionalProperties?: () => Record<string, unknown>;
    browser?: {
        overrides?: {
            info(message: string, context?: Record<string, unknown>): void;
            warn(message: string, context?: Record<string, unknown>): void;
            error(message: string, context?: LogErrorContext): void;
            debug(message: string, context?: Record<string, unknown>): void;
        }
    }


}): AppLogger {
    const basePinoLogger = pino(
        {
            level: level ?? "info",
            mixin: injectAdditionalProperties ?? (() => ({})),
            redact: [
                "req.headers.authorization",
                "req.headers.cookie",
                "password",
                "token",
                "accessToken",
                "refreshToken",
            ],
            browser: browser ? {
                asObject: true, write: browser.overrides ? {
                    info: (o) => {
                        const { msg, level: _level, time: _time, restore: _restore, ...attributes } = o as { time: number, level: string, msg: string, restore: Function };
                        browser.overrides!.info(msg, attributes)
                    },
                    warn: (o) => {
                        const { msg, level: _level, time: _time, restore: _restore, ...attributes } = o as { time: number, level: string, msg: string, restore: Function };
                        browser.overrides!.warn(msg, attributes)
                    },
                    error: (o) => {
                        const { msg, level: _level, time: _time, restore: _restore, ...attributes } = o as { time: number, level: string, msg: string, restore: Function };
                        browser.overrides!.error(msg, attributes)
                    },
                    debug: (o) => {
                        const { msg, level: _level, time: _time, restore: _restore, ...attributes } = o as { time: number, level: string, msg: string, restore: Function };
                        browser.overrides!.debug(msg, attributes)
                    }
                } : undefined
            } : undefined,
        },
        // Format local logs cleanly; output JSON in production. Piped through
        // directly (not via pino's `transport` option) so it runs in-process
        // instead of spawning a worker thread, which relies on `__dirname` to
        // locate its worker script and breaks once this file is bundled into a
        // single ESM file by Nitro's build.
        destinationStream,
    );
    return wrapPinoLogger(basePinoLogger);
}