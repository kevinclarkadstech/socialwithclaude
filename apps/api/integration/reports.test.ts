import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const ana = await createTestUser({ name: "ana" });
const ben = await createTestUser({ name: "ben" });
const cal = await createTestUser({ name: "cal" });
const chat = await valueOf(ana.call.chats.getOrCreateDirectChat({ id: newId(), username: ben.username }));
const say = async (who: typeof ana, content: string) => valueOf(who.call.chats.sendMessage({ id: newId(), chatId: chat.id, content }));

const first = await say(ana, "Is the bike still available?");
const second = await say(ben, "Yes");
const third = await say(ana, "Can you do 50?");
const rude = await say(ben, "Get lost");

const dee = await createTestUser({ name: "dee" });
const eve = await createTestUser({ name: "eve" });
const post = await valueOf(dee.call.posts.createPost({ id: newId(), content: "Selling my bike" }));
const comment = await valueOf(dee.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "DM me" }));

describe("reporting people", () => {
    it("keeps their profile as it was", async () => {
        const report = await valueOf(ana.call.users.reportProfile({ id: newId(), reportedUserId: ben.userId, reason: "impersonation", details: null }));
        expect(report).toMatchObject({ reportedUserId: ben.userId, createdBy: ana.userId, status: "open", snapshot: { username: ben.username } });
    });

    it("replaces your earlier report of the same person", async () => {
        await valueOf(ana.call.users.reportProfile({ id: newId(), reportedUserId: ben.userId, reason: "other", details: "Fake account" }));
        const rows = await db.select().from(schema.profileReports).where(eq(schema.profileReports.reportedUserId, ben.userId));
        expect(rows.map((row) => [row.reason, row.details])).toEqual([["other", "Fake account"]]);
    });

    it("refuses reporting yourself", async () => {
        expect(await outcome(ana.call.users.reportProfile({ id: newId(), reportedUserId: ana.userId, reason: "spam", details: null }))).toBe("BAD_REQUEST");
    });

    it("works after they've blocked you", async () => {
        await valueOf(ben.call.users.blockUser({ username: cal.username }));
        expect(await outcome(cal.call.users.reportProfile({ id: newId(), reportedUserId: ben.userId, reason: "harassment", details: null }))).toBe("OK");
    });
});

describe("reporting chat messages", () => {
    it("keeps the message and the ones before it, oldest first", async () => {
        const report = await valueOf(ana.call.chats.reportMessage({ id: newId(), chatMessageId: rude.id, reason: "harassment", details: null }));
        expect(report.snapshot.message).toMatchObject({ id: rude.id, content: "Get lost", createdBy: ben.userId });
        expect(report.snapshot.earlier.map((message) => message.id)).toEqual([first.id, second.id, third.id]);
    });

    it("refuses your own message", async () => {
        expect(await outcome(ana.call.chats.reportMessage({ id: newId(), chatMessageId: third.id, reason: "spam", details: null }))).toBe("BAD_REQUEST");
    });

    it("is not found outside the chat", async () => {
        expect(await outcome(cal.call.chats.reportMessage({ id: newId(), chatMessageId: rude.id, reason: "spam", details: null }))).toBe("NOT_FOUND");
    });

    it("works after a block", async () => {
        await valueOf(ben.call.users.blockUser({ username: ana.username }));
        expect(await outcome(ana.call.chats.reportMessage({ id: newId(), chatMessageId: second.id, reason: "spam", details: null }))).toBe("OK");
    });

    it("leaves out what the reporter cleared", async () => {
        await valueOf(ben.call.chats.deleteChat({ chatId: chat.id }));
        expect(await outcome(ben.call.chats.reportMessage({ id: newId(), chatMessageId: first.id, reason: "spam", details: null }))).toBe("NOT_FOUND");
    });
});

describe("reporting posts and comments", () => {
    it("works after the creator has blocked you", async () => {
        await valueOf(dee.call.users.blockUser({ username: eve.username }));
        expect(await outcome(eve.call.posts.reportPost({ id: newId(), postId: post.id, reason: "scam", details: null }))).toBe("OK");
        expect(await outcome(eve.call.postComments.reportPostComment({ id: newId(), postCommentId: comment.id, reason: "scam", details: null }))).toBe("OK");
    });

    it("is still not found on a followers-only account's post you don't follow", async () => {
        await valueOf(dee.call.users.updateMySettings({ profileVisibility: "followers" }));
        expect(await outcome(eve.call.posts.reportPost({ id: newId(), postId: post.id, reason: "scam", details: null }))).toBe("NOT_FOUND");
    });
});
