import { describe, expect, it, mock } from "bun:test";
import type { ChatMember } from "../../types/chat-member";
import type { ChatMessageReport } from "../../types/chat-message-report";
import { mockCaller, mockChatMember, mockChatMessage, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { reportChatMessageMutation } from "./reportChatMessageMutation";

const caller = mockCaller();
const reportId = "01JRRRRRRRRRRRRRRRRRRRRRR1";
const theirs = mockChatMessage({ id: "01JEEEEEEEEEEEEEEEEEEEEEE9", createdBy: userId2, createdAt: "2026-01-02T00:00:00.000Z" });
const earlierNewestFirst = [
    mockChatMessage({ id: "01JEEEEEEEEEEEEEEEEEEEEEE3", content: "third" }),
    mockChatMessage({ id: "01JEEEEEEEEEEEEEEEEEEEEEE2", content: "second", createdBy: userId2 }),
];

function run({ members = [mockChatMember(), mockChatMember({ userId: userId2 })], message = theirs }: {
    members?: Pick<ChatMember, "userId" | "clearedAt">[];
    message?: typeof theirs | null;
} = {}) {
    const getChatMessageViewsBefore = mock(async () => earlierNewestFirst);
    const createChatMessageReport = mock(async (args: { id: string; userId: string; chatMessageId: string; snapshot: ChatMessageReport["snapshot"] }): Promise<ChatMessageReport> => ({
        id: args.id,
        chatMessageId: args.chatMessageId,
        reason: "harassment",
        details: null,
        status: "open",
        snapshot: args.snapshot,
        createdBy: args.userId,
        updatedBy: args.userId,
        createdAt: theirs.createdAt,
        updatedAt: theirs.createdAt,
    }));
    const result = reportChatMessageMutation({
        input: { id: reportId, chatMessageId: theirs.id, reason: "harassment", details: null },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getChatMessageViewById: async () => message,
            getChatMembers: async () => members,
            getChatMessageViewsBefore,
            createChatMessageReport,
        },
    });
    return { result, getChatMessageViewsBefore, createChatMessageReport };
}

describe("reportChatMessageMutation", () => {
    it("reports the message with the ones before it, oldest first, as sent", async () => {
        const { result, getChatMessageViewsBefore, createChatMessageReport } = run();
        expect(await result).toMatchObject({ ok: true, value: { id: reportId } });
        expect(getChatMessageViewsBefore).toHaveBeenCalledWith(expect.objectContaining({ beforeId: theirs.id, after: null, viewerId: caller.userId }));
        const { snapshot } = createChatMessageReport.mock.calls[0]![0];
        expect(snapshot.message.id).toBe(theirs.id);
        expect(snapshot.earlier.map((m) => m.content)).toEqual(["second", "third"]);
        expect("viewer" in snapshot.message).toBe(false);
    });

    it("keeps only what the reporter can see since clearing the chat", async () => {
        const clearedAt = "2026-01-01T12:00:00.000Z";
        const { result, getChatMessageViewsBefore } = run({ members: [mockChatMember({ clearedAt }), mockChatMember({ userId: userId2 })] });
        expect((await result).ok).toBe(true);
        expect(getChatMessageViewsBefore).toHaveBeenCalledWith(expect.objectContaining({ after: clearedAt }));
    });

    it("is not found for a message from before the reporter cleared the chat", async () => {
        const { result, createChatMessageReport } = run({ members: [mockChatMember({ clearedAt: "2026-01-03T00:00:00.000Z" }), mockChatMember({ userId: userId2 })] });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(createChatMessageReport).not.toHaveBeenCalled();
    });

    it("is not found for someone outside the chat, without reporting", async () => {
        const { result, createChatMessageReport } = run({ members: [mockChatMember({ userId: userId2 }), mockChatMember({ userId: "01JAAAAAAAAAAAAAAAAAAAAAA3" })] });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found", message: "Message not found" } });
        expect(createChatMessageReport).not.toHaveBeenCalled();
    });

    it("is not found when the message is gone", async () => {
        const { result } = run({ message: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});
