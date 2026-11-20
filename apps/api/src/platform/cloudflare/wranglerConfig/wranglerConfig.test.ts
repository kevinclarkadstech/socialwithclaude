import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
// The rules only: the package index brings in the database, which needs the API's settings.
import { rateLimitRules } from "../../../rate-limiting/constants";
import { countsPerMinute } from "../../../rate-limiting/utils/countsPerMinute/countsPerMinute";
import { cronSchedules } from "../constants";
import { rateLimitBindingName } from "../utils/rateLimitBindingName/rateLimitBindingName";

interface WranglerConfig {
    ratelimits: { name: string; namespace_id: string; simple: { limit: number; period: number } }[];
    triggers: { crons: string[] };
    hyperdrive: { binding: string }[];
    queues: { producers: { queue: string; binding: string }[]; consumers: { queue: string }[] };
}

// The file's comments are whole lines, so dropping those leaves JSON.
const text = readFileSync(path.resolve(import.meta.dir, "../../../../wrangler.jsonc"), "utf8");
const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, "")) as WranglerConfig;

describe("wrangler.jsonc", () => {
    test("has a Rate Limiting binding for each per-minute rule, with its limit and window, and no others", () => {
        const perMinute = Object.values(rateLimitRules).filter(countsPerMinute);
        expect(config.ratelimits.map(({ name, simple }) => ({ name, ...simple })).sort((a, b) => a.name.localeCompare(b.name)))
            .toEqual(perMinute.map((rule) => ({ name: rateLimitBindingName(rule), limit: rule.limit, period: rule.windowSeconds })).sort((a, b) => a.name.localeCompare(b.name)));
        expect(new Set(config.ratelimits.map((binding) => binding.namespace_id)).size).toBe(config.ratelimits.length);
    });

    test("has a Cron Trigger for each scheduled job, and no others", () => {
        expect([...config.triggers.crons].sort()).toEqual(Object.values(cronSchedules).sort());
    });

    test("has the bindings the API reads: Hyperdrive, and the push queue it both sends to and consumes", () => {
        expect(config.hyperdrive.map((binding) => binding.binding)).toEqual(["HYPERDRIVE"]);
        expect(config.queues.producers.map((producer) => producer.binding)).toEqual(["PUSH_QUEUE"]);
        expect(config.queues.consumers.map((consumer) => consumer.queue)).toEqual(config.queues.producers.map((producer) => producer.queue));
    });
});
