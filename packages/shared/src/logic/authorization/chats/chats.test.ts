import { describe, expect, it } from "bun:test";
import { mockCaller, mockChatMember, mockChatMessage, mockProfile, userId2 } from "../../../testing/fixtures";
import { canCreateDirectChat, canDeleteChatMessage, canSendChatMessage, canUpdateChatMessage, canViewChat } from ".";

const signedOut = null;
const midSignUp = mockCaller({ profile: null });
const caller = mockCaller();
const someoneElse = mockCaller({ userId: userId2 });

describe("canCreateDirectChat", () => {
    it("allows a chat with someone else", () => {
        expect(canCreateDirectChat({ caller, receiver: mockProfile({ userId: userId2 }) }).ok).toBe(true);
    });
    it("refuses a chat with yourself", () => {
        expect(canCreateDirectChat({ caller, receiver: mockProfile() })).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(canCreateDirectChat({ caller: signedOut, receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(canCreateDirectChat({ caller: midSignUp, receiver: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe.each([
    ["canViewChat", canViewChat],
    ["canSendChatMessage", canSendChatMessage],
] as const)("%s", (_name, can) => {
    const members = [mockChatMember(), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })];
    it("allows a member", () => {
        expect(can({ caller: caller, members })).toMatchObject({ ok: true, value: { userId: caller.userId } });
    });
    it("hides the chat from anyone else", () => {
        expect(can({ caller: someoneElse, members })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, members })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

describe.each([
    ["canUpdateChatMessage", canUpdateChatMessage],
    ["canDeleteChatMessage", canDeleteChatMessage],
] as const)("%s", (_name, can) => {
    it("allows the sender", () => {
        expect(can({ caller: caller, message: mockChatMessage() }).ok).toBe(true);
    });
    it("refuses anyone else", () => {
        expect(can({ caller: someoneElse, message: mockChatMessage() })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, message: mockChatMessage() })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});
