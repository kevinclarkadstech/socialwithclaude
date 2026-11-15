import { describe, expect, it } from "bun:test";
import { uniqueViolationConstraint } from "./uniqueViolationConstraint";

describe("uniqueViolationConstraint", () => {
    it("names the violated constraint, on the error or its cause", () => {
        expect(uniqueViolationConstraint({ code: "23505", constraint: "user_profiles_pkey" })).toBe("user_profiles_pkey");
        expect(uniqueViolationConstraint(new Error("Failed query", { cause: { code: "23505", constraint: "user_profiles_username_idx" } }))).toBe("user_profiles_username_idx");
    });

    it("is null for anything else", () => {
        expect(uniqueViolationConstraint({ code: "23503", constraint: "fk" })).toBeNull();
        expect(uniqueViolationConstraint(new Error("Connection terminated"))).toBeNull();
        expect(uniqueViolationConstraint(null)).toBeNull();
    });
});
