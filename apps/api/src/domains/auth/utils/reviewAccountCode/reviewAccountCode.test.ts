import { describe, expect, test } from "bun:test";
import { reviewAccountCode } from "./reviewAccountCode";

const reviewAccount = { email: "app-review@example.com", code: "424242" };

describe("reviewAccountCode", () => {
    test("gives the fixed code for the review account's sign-in, whatever its case", () => {
        expect(reviewAccountCode({ email: "app-review@example.com", type: "sign-in", reviewAccount })).toBe("424242");
        expect(reviewAccountCode({ email: " App-Review@Example.com ", type: "sign-in", reviewAccount })).toBe("424242");
    });

    test("gives nothing for anyone else, other kinds of code, or without a review account", () => {
        expect(reviewAccountCode({ email: "someone@example.com", type: "sign-in", reviewAccount })).toBeNull();
        expect(reviewAccountCode({ email: "app-review@example.com", type: "email-verification", reviewAccount })).toBeNull();
        expect(reviewAccountCode({ email: "app-review@example.com", type: "sign-in", reviewAccount: null })).toBeNull();
    });
});
