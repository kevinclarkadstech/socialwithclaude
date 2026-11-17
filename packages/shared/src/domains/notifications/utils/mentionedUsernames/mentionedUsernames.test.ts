import { describe, expect, it } from "bun:test";
import { mentionedUsernames, newlyMentionedUsernames } from "./mentionedUsernames";

describe("mentionedUsernames", () => {
    it("finds each mention once, lowercase", () => {
        expect(mentionedUsernames("Thanks @Sam_K and @jo_park! cc @sam_k")).toEqual(["sam_k", "jo_park"]);
    });

    it("ignores emails, too-short names and mentions inside words", () => {
        expect(mentionedUsernames("mail me at kev@example.com, @ab, x@sam_k")).toEqual([]);
    });

    it("finds a mention at the start, after punctuation, or before it", () => {
        expect(mentionedUsernames("@lee: hi (@kim_r).")).toEqual(["lee", "kim_r"]);
    });
});

describe("newlyMentionedUsernames", () => {
    it("is only who an edit added", () => {
        expect(newlyMentionedUsernames({ before: "hi @sam_k", after: "hi @sam_k and @jo_park" })).toEqual(["jo_park"]);
    });
});
