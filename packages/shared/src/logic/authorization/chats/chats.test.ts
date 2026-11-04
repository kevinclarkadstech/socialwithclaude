import { describe, expect, it } from "bun:test";
import { mockCaller, mockChatMember, mockChatMessage, mockProfile, userId2 } from "../../../testing/fixtures";
import { canCreateDirectChat, canDeleteChatMessage, canSendChatMessage, canUpdateChatMessage, canViewChat } from ".";

const signedOut = null;
const midSignUp = mockCaller({ profile: null });
const caller = mockCaller();
const someoneElse = mockCaller({ userId: userId2 });

describe("canCreateDirectChat", () => {
    it("allows a chat with someone else", () => {
        expect(canCreateDirectChat(caller, mockProfile({ userId: userId2 })).ok).toBe(true);
    });
    it("refuses a chat with yourself", () => {
        expect(canCreateDirectChat(caller, mockProfile())).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(canCreateDirectChat(signedOut, mockProfile({ userId: userId2 }))).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(canCreateDirectChat(midSignUp, mockProfile({ userId: userId2 }))).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe.each([
    ["canViewChat", canViewChat],
    ["canSendChatMessage", canSendChatMessage],
] as const)("%s", (_name, can) => {
    const members = [mockChatMember(), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })];
    it("allows a member", () => {
        expect(can(caller, members)).toMatchObject({ ok: true, value: { userId: caller.userId } });
    });
    it("hides the chat from anyone else", () => {
        expect(can(someoneElse, members)).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("needs a signed-in user", () => {
        expect(can(signedOut, members)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

describe.each([
    ["canUpdateChatMessage", canUpdateChatMessage],
    ["canDeleteChatMessage", canDeleteChatMessage],
] as const)("%s", (_name, can) => {
    it("allows the sender", () => {
        expect(can(caller, mockChatMessage()).ok).toBe(true);
    });
    it("refuses anyone else", () => {
        expect(can(someoneElse, mockChatMessage())).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user", () => {
        expect(can(signedOut, mockChatMessage())).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});
