import { describe, expect, it } from "bun:test";
import { mentionRecipients, type MentionCandidate } from "./mentionRecipients";

const creator = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const actor = "01JAAAAAAAAAAAAAAAAAAAAAA2";
const person = (userId: string, overrides: Partial<MentionCandidate> = {}): MentionCandidate => ({
    userId, followsCreator: false, blockedWithActor: false, blockedWithCreator: false, ...overrides,
});

describe("mentionRecipients", () => {
    it("tells anyone on a public post, but not whoever mentioned them", () => {
        const candidates = [person("01JAAAAAAAAAAAAAAAAAAAAAA3"), person(actor)];
        expect(mentionRecipients({ candidates, actorId: actor, post: { createdBy: creator, profileVisibility: "public" } })).toEqual(["01JAAAAAAAAAAAAAAAAAAAAAA3"]);
    });

    it("on a followers-only post, tells only followers and the creator", () => {
        const candidates = [person("01JAAAAAAAAAAAAAAAAAAAAAA3"), person("01JAAAAAAAAAAAAAAAAAAAAAA4", { followsCreator: true }), person(creator)];
        expect(mentionRecipients({ candidates, actorId: actor, post: { createdBy: creator, profileVisibility: "followers" } }))
            .toEqual(["01JAAAAAAAAAAAAAAAAAAAAAA4", creator]);
    });

    it("never across a block with whoever mentioned them or the creator", () => {
        const candidates = [person("01JAAAAAAAAAAAAAAAAAAAAAA3", { blockedWithActor: true }), person("01JAAAAAAAAAAAAAAAAAAAAAA4", { blockedWithCreator: true })];
        expect(mentionRecipients({ candidates, actorId: actor, post: { createdBy: creator, profileVisibility: "public" } })).toEqual([]);
    });
});
