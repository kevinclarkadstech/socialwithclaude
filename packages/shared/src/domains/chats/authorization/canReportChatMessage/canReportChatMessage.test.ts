import { describe, expect, it } from "bun:test";
import { itAllowsOnlyChatMembers } from "../../../../testing/authorization";
import { mockCaller, mockChatMember, mockChatMessage, userId2 } from "../../../../testing/fixtures";
import { canReportChatMessage } from "./canReportChatMessage";

const theirs = mockChatMessage({ createdBy: userId2 });
const members = [mockChatMember(), mockChatMember({ userId: userId2 })];

describe("canReportChatMessage", () => {
    itAllowsOnlyChatMembers(({ caller, members }) => canReportChatMessage({ caller, members, message: theirs }));

    it("refuses your own message", () => {
        expect(canReportChatMessage({ caller: mockCaller(), members, message: mockChatMessage() })).toMatchObject({ ok: false, error: { type: "validation" } });
    });

    it("allows across a block, either way", () => {
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canReportChatMessage({ caller: blocking, members, message: theirs }).ok).toBe(true);
        expect(canReportChatMessage({ caller: blockedBy, members, message: theirs }).ok).toBe(true);
    });

    it("needs sign-up to be finished", () => {
        expect(canReportChatMessage({ caller: mockCaller({ profile: null }), members, message: theirs })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
