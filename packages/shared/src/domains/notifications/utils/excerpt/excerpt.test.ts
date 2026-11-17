import { describe, expect, it } from "bun:test";
import { excerpt } from "./excerpt";

describe("excerpt", () => {
    it("keeps short text as it is", () => {
        expect(excerpt("Looks great!", 100)).toBe("Looks great!");
    });

    it("cuts at the last whole word, with …", () => {
        expect(excerpt("It was really nice to see everyone there yesterday", 30)).toBe("It was really nice to see…");
    });

    it("drops punctuation before the …, and squashes line breaks", () => {
        expect(excerpt("Great photo,\n\nwhere was this taken exactly", 15)).toBe("Great photo…");
    });

    it("cuts a single long word where it has to", () => {
        expect(excerpt("a".repeat(20), 10)).toBe(`${"a".repeat(9)}…`);
    });
});
