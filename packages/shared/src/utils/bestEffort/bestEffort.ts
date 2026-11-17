import type { AppLogger } from "../../observability";

/**
 * Runs `run` after the main work is done, without letting it fail that work:
 * an error is logged (as `what` failed) and swallowed. For side effects like
 * sending notifications, where the comment or follow has already happened.
 */
export async function bestEffort({ logger, what, run }: { logger: AppLogger; what: string; run: () => Promise<unknown> }): Promise<void> {
    try {
        await run();
    } catch (error) {
        logger.error(`Couldn't ${what}`, { err: error });
    }
}
