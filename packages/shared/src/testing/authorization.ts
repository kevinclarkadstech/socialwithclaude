import { expect, it } from "bun:test";
import type { CallingUser } from "../domains/users/types/calling-user";
import { mockCaller, mockChatMember, mockChatMessage, mockProfile, userId2 } from "./fixtures";

/**
 * Cases shared by authorization checks with the same rule, so each check's own
 * test file says which rule it follows. Call them inside the check's describe.
 */

type Check<Context> = (args: { caller: CallingUser | null } & Context) => { ok: boolean };

const signedOut = null;
const midSignUp = mockCaller({ profile: null });
const author = mockCaller();
const someoneElse = mockCaller({ userId: userId2 });

/** Only the author of `context`'s post or comment, once they've finished sign-up. */
export function itAllowsOnlyTheAuthor<Context>(can: Check<Context>, context: Context) {
    it("allows the author", () => {
        expect(can({ caller: author, ...context })).toMatchObject({ ok: true, value: { userId: author.userId } });
    });
    it("refuses someone else", () => {
        expect(can({ caller: someoneElse, ...context })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    itNeedsAFinishedSignUp(can, context);
}

/** Anyone who has finished sign-up, author or not. */
export function itAllowsAnyoneSignedUp<Context>(can: Check<Context>, context: Context) {
    it("allows anyone who finished sign-up, author or not", () => {
        expect(can({ caller: author, ...context }).ok).toBe(true);
        expect(can({ caller: someoneElse, ...context }).ok).toBe(true);
    });
    itNeedsAFinishedSignUp(can, context);
}

function itNeedsAFinishedSignUp<Context>(can: Check<Context>, context: Context) {
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, ...context })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
    it("needs sign-up to be finished", () => {
        expect(can({ caller: midSignUp, ...context })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
}

/** Only members of the chat; to anyone else it doesn't exist. */
export function itAllowsOnlyChatMembers(can: Check<{ members: ReturnType<typeof mockChatMember>[] }>) {
    const members = [mockChatMember(), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })];
    it("allows a member", () => {
        expect(can({ caller: author, members })).toMatchObject({ ok: true, value: { userId: author.userId } });
    });
    it("hides the chat from anyone else", () => {
        expect(can({ caller: someoneElse, members })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, members })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
}

/** Only the message's sender. */
export function itAllowsOnlyTheSender(can: Check<{ message: ReturnType<typeof mockChatMessage> }>) {
    it("allows the sender", () => {
        expect(can({ caller: author, message: mockChatMessage() }).ok).toBe(true);
    });
    it("refuses anyone else", () => {
        expect(can({ caller: someoneElse, message: mockChatMessage() })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, message: mockChatMessage() })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
}

/** Anyone signed up, about someone other than themselves. */
export function itAllowsOnlySomeoneElse(can: Check<{ target: ReturnType<typeof mockProfile> }>) {
    it("allows someone else", () => {
        expect(can({ caller: mockCaller(), target: mockProfile({ userId: userId2 }) }).ok).toBe(true);
    });
    it("refuses yourself", () => {
        expect(can({ caller: mockCaller(), target: mockProfile() })).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(can({ caller: null, target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(can({ caller: mockCaller({ profile: null }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
}
