import type { AppLogger } from "../observability";

/** A logger that discards everything, for tests. */
export const silentLogger: AppLogger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
    child() {
        return silentLogger;
    },
    setBindings() {},
};

export const testContext = { logger: silentLogger };
