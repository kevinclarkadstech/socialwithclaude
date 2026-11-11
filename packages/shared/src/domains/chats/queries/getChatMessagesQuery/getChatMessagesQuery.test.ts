import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockChatMember, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { getChatMessagesQuery } from "./getChatMessagesQuery";

const chatId = mockChatMember().chatId;
const clearedAt = "2026-02-01T00:00:00.000Z";

function run(callerId: string) {
    const getChatMessageViews = mock(async () => ({ items: [], nextCursor: null }));
    const result = getChatMessagesQuery({
        input: { chatId, limit: 20 },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller({ userId: callerId }),
            getChatMembers: async () => [mockChatMember({ clearedAt }), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })],
            getChatMessageViews,
        },
    });
    return { result, getChatMessageViews };
}

describe("getChatMessagesQuery", () => {
    it("hides messages from before the member deleted the chat", async () => {
        const { result, getChatMessageViews } = run(mockCaller().userId);
        expect((await result).ok).toBe(true);
        expect(getChatMessageViews).toHaveBeenCalledWith({ chatId, limit: 20, viewerId: mockCaller().userId, after: clearedAt });
    });

    it("is not found for someone who isn't in the chat", async () => {
        const { result, getChatMessageViews } = run(userId2);
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(getChatMessageViews).not.toHaveBeenCalled();
    });
});
