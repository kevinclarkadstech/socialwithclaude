import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { canCreateDirectChat } from "./canCreateDirectChat";

const caller = mockCaller();

describe("canCreateDirectChat", () => {
    it("allows a chat with someone else", () => {
        expect(canCreateDirectChat({ caller, receiver: mockProfile({ userId: userId2 }) }).ok).toBe(true);
    });
    it("refuses a chat with yourself", () => {
        expect(canCreateDirectChat({ caller, receiver: mockProfile() })).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("refuses someone who blocked you, as not-found", () => {
        const blocked = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canCreateDirectChat({ caller: blocked, receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("refuses someone you blocked, until you unblock them", () => {
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        expect(canCreateDirectChat({ caller: blocking, receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(canCreateDirectChat({ caller: null, receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(canCreateDirectChat({ caller: mockCaller({ profile: null }), receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
