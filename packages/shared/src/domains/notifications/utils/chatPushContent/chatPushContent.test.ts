import { describe, expect, it } from "bun:test";
import { chatPushContent } from "./chatPushContent";

describe("chatPushContent", () => {
    it("shows one message as it is, and several as a count with the latest", () => {
        expect(chatPushContent({ senderUsername: "sam_k", unreadCount: 1, latestMessage: "Is the bike still available?" }))
            .toEqual({ title: "@sam_k", body: "Is the bike still available?" });
        expect(chatPushContent({ senderUsername: "sam_k", unreadCount: 4, latestMessage: "Hello?" }))
            .toEqual({ title: "@sam_k · 4 new messages", body: "Hello?" });
    });

    it("shortens a long message", () => {
        const { body } = chatPushContent({ senderUsername: "sam_k", unreadCount: 1, latestMessage: "word ".repeat(100) });
        expect(body.length).toBeLessThanOrEqual(140);
        expect(body.endsWith("…")).toBe(true);
    });
});
