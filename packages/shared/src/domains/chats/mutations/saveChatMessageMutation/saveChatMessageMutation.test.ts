import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockChatMember, mockChatMessage, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { saveChatMessageMutation } from "./saveChatMessageMutation";

function run(callerId: string) {
    const saveChatMessage = mock(async () => true);
    const result = saveChatMessageMutation({
        input: { chatMessageId: mockChatMessage().id },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller({ userId: callerId }),
            getChatMessageViewById: async () => mockChatMessage(),
            getChatMembers: async () => [mockChatMember(), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })],
            saveChatMessage,
        },
    });
    return { result, saveChatMessage };
}

describe("saveChatMessageMutation", () => {
    it("saves a message from one of the caller's chats", async () => {
        const { result, saveChatMessage } = run(mockCaller().userId);
        expect((await result).ok).toBe(true);
        expect(saveChatMessage).toHaveBeenCalledWith({ userId: mockCaller().userId, chatMessageId: mockChatMessage().id });
    });

    it("is not found for someone who isn't in the chat", async () => {
        const { result, saveChatMessage } = run(userId2);
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(saveChatMessage).not.toHaveBeenCalled();
    });
});
