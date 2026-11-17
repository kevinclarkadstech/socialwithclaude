import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const mod = await createTestUser({ name: "mod" });
await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, mod.userId));
const troll = await createTestUser({ name: "troll" });
const amy = await createTestUser({ name: "amy" });
const bo = await createTestUser({ name: "bo" });

const post = await valueOf(troll.call.posts.createPost({ id: newId(), content: "Buy followers cheap" }));
const comment = await valueOf(troll.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "DM me" }));
await valueOf(amy.call.posts.reportPost({ id: newId(), postId: post.id, reason: "spam", details: null }));
await valueOf(bo.call.posts.reportPost({ id: newId(), postId: post.id, reason: "scam", details: "Took my money" }));
await valueOf(amy.call.postComments.reportPostComment({ id: newId(), postCommentId: comment.id, reason: "spam", details: null }));
await valueOf(amy.call.users.reportProfile({ id: newId(), reportedUserId: troll.userId, reason: "impersonation", details: null }));

// Other test files' reports are in the same database: only this file's (about troll) count here.
const openQueue = async () => (await valueOf(mod.call.moderation.getReportQueue({ status: "open", limit: 100 }))).filter((item) => item.subject.userId === troll.userId);
const actionsAbout = async (userId: string) =>
    (await db.select().from(schema.moderationActions).where(eq(schema.moderationActions.subjectUserId, userId))).map((row) => row.action);

describe("moderation", () => {
    it("is for admins only", async () => {
        expect(await outcome(amy.call.moderation.getReportQueue({ status: "open" }))).toBe("FORBIDDEN");
        expect(await outcome(amy.call.moderation.banUser({ userId: troll.userId }))).toBe("FORBIDDEN");
        expect(await outcome(amy.call.moderation.getFeedback({}))).toBe("FORBIDDEN");
    });

    it("queues one item per reported thing, oldest first, with every report about it", async () => {
        const queue = await openQueue();
        expect(queue.map((item) => [item.kind, item.targetId])).toEqual([
            ["post", post.id],
            ["postComment", comment.id],
            ["profile", troll.userId],
        ]);
        const [reportedPost] = queue;
        expect(reportedPost?.reports.map((report) => report.reason)).toEqual(["scam", "spam"]);
        expect(reportedPost?.subject).toMatchObject({ userId: troll.userId, username: troll.username, isBanned: false });
        expect(reportedPost?.kind === "post" && reportedPost.snapshot.content).toBe("Buy followers cheap");
    });

    it("removes a post, settling its reports and logging it", async () => {
        expect(await valueOf(mod.call.moderation.resolveReports({ kind: "post", targetId: post.id, outcome: "removed", note: "Spam" }))).toEqual({ resolvedCount: 2 });
        expect(await outcome(amy.call.posts.getPostById({ postId: post.id }))).toBe("NOT_FOUND");
        expect((await openQueue()).map((item) => item.kind)).not.toContain("post");
        const resolved = await valueOf(mod.call.moderation.getReportQueue({ status: "resolved", limit: 100 }));
        expect(resolved.find((item) => item.targetId === post.id)?.reports.map((report) => report.status)).toEqual(["reviewed", "reviewed"]);
        expect(await actionsAbout(troll.userId)).toEqual(["remove_content"]);
    });

    it("won't settle the same reports twice", async () => {
        expect(await outcome(mod.call.moderation.resolveReports({ kind: "post", targetId: post.id, outcome: "dismissed" }))).toBe("CONFLICT");
    });

    it("dismisses a comment's reports, keeping the comment", async () => {
        await valueOf(mod.call.moderation.resolveReports({ kind: "postComment", targetId: comment.id, outcome: "dismissed" }));
        const [row] = await db.select().from(schema.postComments).where(eq(schema.postComments.id, comment.id));
        expect(row?.deletedAt).toBeNull();
    });

    it("can't remove a profile, only ban its person", async () => {
        expect(await outcome(mod.call.moderation.resolveReports({ kind: "profile", targetId: troll.userId, outcome: "removed" }))).toBe("BAD_REQUEST");
    });

    it("bans someone: signed out everywhere, logged, and their reports settled", async () => {
        await db.insert(schema.sessions).values({ token: `t-${newId()}`, userId: troll.userId, expiresAt: new Date(Date.now() + 86_400_000) });
        await valueOf(mod.call.moderation.banUser({ userId: troll.userId, reason: "Spam account" }));
        await valueOf(mod.call.moderation.resolveReports({ kind: "profile", targetId: troll.userId, outcome: "reviewed" }));
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, troll.userId));
        expect(user).toMatchObject({ banned: true, banReason: "Spam account", banExpires: null });
        expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, troll.userId))).toEqual([]);
        expect(await openQueue()).toEqual([]);
        expect(await actionsAbout(troll.userId)).toEqual(expect.arrayContaining(["ban_user", "mark_reviewed"]));
    });

    it("refuses banning yourself, another admin, or until a time that has passed", async () => {
        expect(await outcome(mod.call.moderation.banUser({ userId: mod.userId }))).toBe("BAD_REQUEST");
        expect(await outcome(mod.call.moderation.banUser({ userId: amy.userId, expiresAt: new Date(Date.now() - 1000).toISOString() }))).toBe("BAD_REQUEST");
        await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, bo.userId));
        expect(await outcome(mod.call.moderation.banUser({ userId: bo.userId }))).toBe("BAD_REQUEST");
    });

    it("unbans", async () => {
        await valueOf(mod.call.moderation.unbanUser({ userId: troll.userId }));
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, troll.userId));
        expect(user).toMatchObject({ banned: false, banReason: null });
        expect(await actionsAbout(troll.userId)).toContain("unban_user");
    });

    it("lists feedback and marks it done", async () => {
        const sent = await valueOf(amy.call.feedback.submitFeedback({ id: newId(), category: "bug", message: "The map won't load", pageUrl: null }));
        const page = await valueOf(mod.call.moderation.getFeedback({ status: "new" }));
        expect(page.items.find((item) => item.id === sent.id)).toMatchObject({ message: "The map won't load", user: { username: amy.username } });
        await valueOf(mod.call.moderation.updateFeedbackStatus({ id: sent.id, status: "done" }));
        const [row] = await db.select().from(schema.userFeedback).where(and(eq(schema.userFeedback.id, sent.id), eq(schema.userFeedback.status, "done")));
        expect(row).toBeDefined();
    });
});
