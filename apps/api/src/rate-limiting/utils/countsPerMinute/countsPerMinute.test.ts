import { expect, test } from "bun:test";
import { rateLimitRules } from "../../constants";
import { countsPerMinute } from "./countsPerMinute";

test("only rules with a 10 or 60 second window count per minute", () => {
    expect(countsPerMinute({ name: "a", limit: 1, windowSeconds: 10 })).toBe(true);
    expect(countsPerMinute({ name: "b", limit: 1, windowSeconds: 60 })).toBe(true);
    expect(countsPerMinute({ name: "c", limit: 1, windowSeconds: 30 })).toBe(false);
    expect(countsPerMinute({ name: "d", limit: 1, windowSeconds: 15 * 60 })).toBe(false);
});

test("every rule guarding email is counted exactly, not per minute", () => {
    const guardingEmail = Object.values(rateLimitRules).filter((rule) => "whenUnavailable" in rule && rule.whenUnavailable === "refuse");
    expect(guardingEmail.length).toBeGreaterThan(0);
    for (const rule of guardingEmail) {
        expect(countsPerMinute(rule)).toBe(false);
    }
});
