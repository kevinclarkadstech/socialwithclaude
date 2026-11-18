import { describe, expect, it } from "bun:test";
import { ageInYears } from "./ageInYears";

describe("ageInYears", () => {
    const today = new Date("2026-11-18T12:00:00Z");

    it("counts whole years, with the birthday at the end of the birth month", () => {
        expect(ageInYears({ birthYear: 2013, birthMonth: 10, today })).toBe(13);
        // Born in November: still 12 until the month is over.
        expect(ageInYears({ birthYear: 2013, birthMonth: 11, today })).toBe(12);
        expect(ageInYears({ birthYear: 2013, birthMonth: 12, today })).toBe(12);
        expect(ageInYears({ birthYear: 1990, birthMonth: 1, today })).toBe(36);
    });
});
