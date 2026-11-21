import type { NitroApp } from "nitro/types";
import { setPushesDueListener } from "../../../../data-access";
import { withRequestDatabase } from "../../../../data-access/db";
import { runAccountPurge, runMediaSweep, runPushDeliveryRound } from "../../../../jobs";
import { rootLogger } from "../../../observability";
import { cronSchedules, pushQueueSlackSeconds } from "../constants";
import type { CloudflareEnv, MessageBatch, ScheduledController } from "../types";
import { cloudflareEnv, hyperdriveConnectionString } from "../utils/cloudflareEnv/cloudflareEnv";

/**
 * What runs outside requests on Workers, where nothing runs between them:
 *
 * - Pushes: when one becomes due (pushesDue), a message goes on the push
 *   queue, delayed until then; its consumer runs a delivery round. A Cron
 *   Trigger also runs one every 15 minutes, in case a message was lost.
 * - The daily jobs: purging deleted accounts and sweeping orphaned photo files.
 *
 * Each runs with a database client of its own, through Hyperdrive, like a request.
 */
export function setUpCloudflare(nitroApp: Required<Pick<NitroApp, "hooks">>): void {
    setPushesDueListener(async ({ inSeconds }) => {
        try {
            const queue = cloudflareEnv().PUSH_QUEUE;
            if (!queue) {
                rootLogger.warn("No PUSH_QUEUE binding: pushes wait for the next minute's Cron Trigger");
                return;
            }
            await queue.send({ kind: "deliver-pushes" }, { delaySeconds: inSeconds + pushQueueSlackSeconds });
        } catch (err) {
            // The Cron Trigger still sends it within a minute.
            rootLogger.warn("Couldn't queue push delivery", { err });
        }
    });

    nitroApp.hooks.hook("cloudflare:scheduled", ({ controller, env }: { controller: ScheduledController; env: unknown }) =>
        inOwnDatabase(env as CloudflareEnv, () => runScheduled(controller.cron)));

    nitroApp.hooks.hook("cloudflare:queue", async ({ batch, env }: { batch: MessageBatch; env: unknown }) => {
        // One round sends everything due, so one per batch, however many messages it holds.
        const delivered = await inOwnDatabase(env as CloudflareEnv, () => runPushDeliveryRound({ context: { command: "push-queue" } }));
        if (delivered) {
            batch.ackAll();
        } else {
            batch.retryAll({ delaySeconds: 10 });
        }
    });
}

async function runScheduled(cron: string): Promise<void> {
    if (cron === cronSchedules.pushDelivery) {
        await runPushDeliveryRound({ context: { command: "push-cron" } });
        return;
    }
    if (cron === cronSchedules.daily) {
        await runAccountPurge({ context: { command: "accounts:purge" } });
        await runMediaSweep({ olderThanHours: 24, dryRun: false, context: { command: "media:sweep" } });
        return;
    }
    rootLogger.warn("A Cron Trigger with no job ran", { cron });
}

function inOwnDatabase<T>(env: CloudflareEnv, handle: () => Promise<T>): Promise<T> {
    return withRequestDatabase({ connectionString: hyperdriveConnectionString(env), handle });
}
