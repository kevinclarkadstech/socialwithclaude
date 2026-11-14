import { describe, expect, it, mock } from "bun:test";
import type { CallingUser } from "../../../users/types/calling-user";
import type { ChatView } from "../../types/chat";
import { mockCaller, mockChatMember, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { getChatQuery } from "./getChatQuery";

const chatId = mockChatMember().chatId;
const other = mockProfile({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3", username: "jo_park" });
const chat: ChatView = {
    id: chatId,
    receiverId: other.userId,
    lastMessageAt: null,
    createdBy: mockCaller().userId,
    updatedBy: mockCaller().userId,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    otherMember: { userId: other.userId, username: other.username, firstName: null, lastName: null, updatedAt: other.updatedAt },
    lastMessage: null,
    viewer: { hasUnread: false },
};

function run(caller: CallingUser | null) {
    const getChatViewById = mock(async () => chat);
    const result = getChatQuery({
        input: { chatId },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getChatMembers: async () => [mockChatMember(), mockChatMember({ userId: other.userId })],
            getChatViewById,
        },
    });
    return { result, getChatViewById };
}

describe("getChatQuery", () => {
    it("returns the chat to one of its members", async () => {
        const { result, getChatViewById } = run(mockCaller());
        expect(await result).toEqual({ ok: true, value: chat });
        expect(getChatViewById).toHaveBeenCalledWith({ chatId, viewerId: mockCaller().userId });
    });

    it("is not found for someone who isn't in it", async () => {
        const { result, getChatViewById } = run(mockCaller({ userId: userId2 }));
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(getChatViewById).not.toHaveBeenCalled();
    });

    it("needs a signed-in user", async () => {
        const { result } = run(null);
        expect(await result).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});
