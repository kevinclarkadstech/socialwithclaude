import { describe, expect, it } from "bun:test";
import { itAllowsOnlyChatMembers } from "../../../../testing/authorization";
import { mockCaller, mockChatMember } from "../../../../testing/fixtures";
import { canSendChatMessage } from "./canSendChatMessage";

const otherId = "01JAAAAAAAAAAAAAAAAAAAAAA3";
const members = [mockChatMember(), mockChatMember({ userId: otherId })];

describe("canSendChatMessage", () => {
    itAllowsOnlyChatMembers(canSendChatMessage);

    it("refuses a member the other person blocked, as not-found", () => {
        const caller = mockCaller({ blockList: { blocking: [], blockedBy: [otherId] } });
        expect(canSendChatMessage({ caller, members })).toMatchObject({ ok: false, error: { type: "not-found", metadata: { reason: "blocked-by-user" } } });
    });

    it("refuses a member who blocked the other person, until they unblock", () => {
        const caller = mockCaller({ blockList: { blocking: [otherId], blockedBy: [] } });
        expect(canSendChatMessage({ caller, members })).toMatchObject({ ok: false, error: { type: "authorization", metadata: { reason: "blocking-user" } } });
    });
});
