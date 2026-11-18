import { describe, expect, it } from "bun:test";
import { needsToAcceptTerms } from "./needsToAcceptTerms";

describe("needsToAcceptTerms", () => {
    it("asks again only when the major version has gone up", () => {
        expect(needsToAcceptTerms({ acceptedVersion: null, currentVersion: "1.0" })).toBe(true);
        expect(needsToAcceptTerms({ acceptedVersion: "1.0", currentVersion: "1.3" })).toBe(false);
        expect(needsToAcceptTerms({ acceptedVersion: "1.3", currentVersion: "2.0" })).toBe(true);
        expect(needsToAcceptTerms({ acceptedVersion: "2.0", currentVersion: "2.0" })).toBe(false);
    });
});
