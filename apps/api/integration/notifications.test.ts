import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const admin = await createTestUser({ name: "chief" });
await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, admin.userId));
const poster = await createTestUser({ name: "poster" });
const rita = await createTestUser({ name: "rita" });
const omar = await createTestUser({ name: "omar" });

const post = await valueOf(poster.call.posts.createPost({ id: newId(), content: "Spammy spam" }));
const comment = await valueOf(poster.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "Rude words" }));
await valueOf(rita.call.posts.reportPost({ id: newId(), postId: post.id, reason: "spam", details: null }));
await valueOf(omar.call.posts.reportPost({ id: newId(), postId: post.id, reason: "spam", details: null }));
await valueOf(rita.call.postComments.reportPostComment({ id: newId(), postCommentId: comment.id, reason: "harassment", details: null }));

const unread = async (who: typeof rita) => (await valueOf(who.call.notifications.getUnreadCount({}))).count;
const mine = async (who: typeof rita) => (await valueOf(who.call.notifications.getMine({}))).items;

describe("notifications", () => {
    it("start empty", async () => {
        expect(await unread(rita)).toBe(0);
        expect(await mine(rita)).toEqual([]);
    });

    it("tell each reporter how their report went", async () => {
        await valueOf(admin.call.admin.resolveReports({ kind: "post", targetId: post.id, outcome: "removed" }));
        await valueOf(admin.call.admin.resolveReports({ kind: "postComment", targetId: comment.id, outcome: "dismissed" }));
        expect(await unread(rita)).toBe(2);
        expect((await mine(rita)).map((item) => [item.type, item.data])).toEqual([
            ["report_resolved", { kind: "postComment", outcome: "dismissed" }],
            ["report_resolved", { kind: "post", outcome: "removed" }],
        ]);
        expect((await mine(omar)).map((item) => item.data)).toEqual([{ kind: "post", outcome: "removed" }]);
        expect(await mine(poster)).toEqual([]);
    });

    it("are marked read all at once, for the caller only", async () => {
        await valueOf(rita.call.notifications.markAllRead({}));
        expect(await unread(rita)).toBe(0);
        expect((await mine(rita)).every((item) => item.readAt !== null)).toBe(true);
        expect(await unread(omar)).toBe(1);
    });

    it("carry an admin's warning, which counts in the person's history", async () => {
        await valueOf(admin.call.admin.warnUser({ userId: poster.userId, reason: "harassment", note: "Keep it civil", kind: "postComment", targetId: comment.id }));
        expect((await mine(poster)).map((item) => [item.type, item.data])).toEqual([
            ["warning", { reason: "harassment", note: "Keep it civil", kind: "postComment" }],
        ]);
        await valueOf(omar.call.users.reportProfile({ id: newId(), reportedUserId: poster.userId, reason: "spam", details: null }));
        const queue = await valueOf(admin.call.admin.getReportQueue({ status: "open", limit: 100 }));
        expect(queue.find((item) => item.subject.userId === poster.userId)?.subject.history).toEqual({ warnings: 1, removals: 1, bans: 0 });
    });

    it("warnings are for admins to send, and not to admins", async () => {
        expect(await outcome(rita.call.admin.warnUser({ userId: poster.userId, reason: "spam" }))).toBe("FORBIDDEN");
        expect(await outcome(admin.call.admin.warnUser({ userId: admin.userId, reason: "spam" }))).toBe("BAD_REQUEST");
    });

    it("need sign-in", async () => {
        expect(await outcome(callAs(null).notifications.getUnreadCount({}))).toBe("UNAUTHORIZED");
    });
});
