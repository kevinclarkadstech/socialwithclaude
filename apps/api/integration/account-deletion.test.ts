import { describe, expect, it, spyOn } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { isEmailBanned, purgeAccount, purgeDueAccounts } from "../src/accounts";
import { emailSender } from "../src/notifications/email/delivery/emailSender/emailSender";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child: () => silentLogger, setBindings() {} };

/** Storage that only records what it was asked to delete. */
function fakeStorage() {
    const deleted: string[] = [];
    return { deleted, storage: { deleteMedia: async ({ keys }: { keys: string[] }) => { deleted.push(...keys); } } };
}

/** Asks for a deletion code as `user`, and reads it from the email that would have been sent. */
async function requestCode(user: { call: Awaited<ReturnType<typeof createTestUser>>["call"] }): Promise<string> {
    const send = spyOn(emailSender, "send").mockImplementation(async () => {});
    try {
        await valueOf(user.call.auth.sendAccountDeletionCode({}));
        const text = send.mock.calls[0]?.[0].text ?? "";
        return /\b(\d{6})\b/.exec(text)![1]!;
    } finally {
        send.mockRestore();
    }
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// The tests run in order and build on each other.
const admin = await createTestUser({ name: "chief" });
await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, admin.userId));
const leaving = await createTestUser({ name: "leaving" });
const friend = await createTestUser({ name: "friend" });
const reporter = await createTestUser({ name: "tattle" });

await valueOf(leaving.call.users.follow({ username: friend.username }));
await valueOf(friend.call.users.follow({ username: leaving.username }));
const leavingsPost = await valueOf(leaving.call.posts.createPost({ id: newId(), content: "Moving away soon" }));
const friendsCommentOnIt = await valueOf(friend.call.postComments.createPostComment({ id: newId(), postId: leavingsPost.id, content: "Noo" }));
const friendsPost = await valueOf(friend.call.posts.createPost({ id: newId(), content: "Beach day" }));
const friendsComment = await valueOf(friend.call.postComments.createPostComment({ id: newId(), postId: friendsPost.id, content: "Lovely" }));
await valueOf(leaving.call.postComments.createPostComment({ id: newId(), postId: friendsPost.id, content: "Jealous" }));
await valueOf(leaving.call.posts.save({ postId: friendsPost.id }));
await valueOf(leaving.call.postComments.setPostCommentVote({ postCommentId: friendsComment.id, value: 1 }));
const chat = await valueOf(friend.call.chats.getOrCreateDirectChat({ id: newId(), username: leaving.username }));
await valueOf(friend.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Keep in touch" }));
await valueOf(leaving.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Will do" }));
const report = await valueOf(reporter.call.posts.reportPost({ id: newId(), postId: leavingsPost.id, reason: "spam", details: null }));
await valueOf(admin.call.admin.warnUser({ userId: leaving.userId, reason: "spam", kind: "post", targetId: leavingsPost.id }));

const friendsProfile = async () => (await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, friend.userId)))[0]!;
const friendsPostRow = async () => (await db.select().from(schema.posts).where(eq(schema.posts.id, friendsPost.id)))[0]!;
const friendsCommentRow = async () => (await db.select().from(schema.postComments).where(eq(schema.postComments.id, friendsComment.id)))[0]!;

describe("deleting an account", () => {
    it("needs the emailed code: a wrong one is refused, the right one schedules it for 30 days and signs out every device", async () => {
        await db.insert(schema.sessions).values({ userId: leaving.userId, token: `token-${newId()}`, expiresAt: daysAgo(-7) });
        const code = await requestCode(leaving);
        const wrong = code === "000000" ? "111111" : "000000";
        expect(await outcome(leaving.call.auth.scheduleAccountDeletion({ code: wrong }))).toBe("BAD_REQUEST");

        const scheduled = await valueOf(leaving.call.auth.scheduleAccountDeletion({ code }));
        expect(Math.round((new Date(scheduled.deletesAt).getTime() - Date.now()) / 86_400_000)).toBe(30);
        expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, leaving.userId))).toEqual([]);
        // The code is used up.
        expect(await outcome(leaving.call.auth.scheduleAccountDeletion({ code }))).toBe("CONFLICT");
    });

    it("hides them everywhere while it's scheduled, and they can do nothing but restore it", async () => {
        expect(await outcome(friend.call.users.getUserProfile({ username: leaving.username }))).toBe("NOT_FOUND");
        expect(await outcome(friend.call.posts.getPostById({ postId: leavingsPost.id }))).toBe("NOT_FOUND");
        expect((await valueOf(friend.call.chats.getMyChats({ limit: 50 }))).items.find((item) => item.id === chat.id)?.otherMember.isUnavailable).toBe(true);

        expect(await outcome(leaving.call.posts.createPost({ id: newId(), content: "Still here?" }))).toBe("UNAUTHORIZED");
        expect((await valueOf(leaving.call.users.me({})))?.deletionScheduledAt).not.toBeNull();
    });

    it("brings everything back when they restore it", async () => {
        await valueOf(leaving.call.auth.restoreAccount({}));
        expect(await outcome(friend.call.posts.getPostById({ postId: leavingsPost.id }))).toBe("OK");
        expect((await valueOf(leaving.call.users.me({})))?.deletionScheduledAt).toBeNull();
        expect(await outcome(leaving.call.auth.restoreAccount({}))).toBe("CONFLICT");
    });

    it("stops a code working after 3 wrong tries", async () => {
        const code = await requestCode(leaving);
        const wrong = code === "000000" ? "111111" : "000000";
        for (let i = 0; i < 3; i++) {
            expect(await outcome(leaving.call.auth.scheduleAccountDeletion({ code: wrong }))).toBe("BAD_REQUEST");
        }
        expect(await outcome(leaving.call.auth.scheduleAccountDeletion({ code }))).toBe("BAD_REQUEST");
    });
});

describe("purging a deleted account", () => {
    it("leaves an account alone within its 30 days", async () => {
        await db.update(schema.users).set({ deletionScheduledAt: daysAgo(29) }).where(eq(schema.users.id, leaving.userId));
        const { storage } = fakeStorage();
        await purgeDueAccounts({ storage, logger: silentLogger });
        expect(await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, leaving.userId))).toHaveLength(1);
    });

    it("deletes everything after 30 days, with their photo files, and takes them out of other people's counts", async () => {
        const before = { profile: await friendsProfile(), post: await friendsPostRow(), comment: await friendsCommentRow() };
        await db.update(schema.users).set({ deletionScheduledAt: daysAgo(31) }).where(eq(schema.users.id, leaving.userId));
        const { storage, deleted } = fakeStorage();
        const summary = await purgeDueAccounts({ storage, logger: silentLogger });
        expect(summary.purged).toBeGreaterThanOrEqual(1);
        expect(deleted).toContain(`users/${leaving.userId}/avatar-96`);

        expect(await db.select().from(schema.users).where(eq(schema.users.id, leaving.userId))).toEqual([]);
        expect(await db.select().from(schema.posts).where(eq(schema.posts.createdBy, leaving.userId))).toEqual([]);
        // Other people's comments on their posts go with the posts, and their chats with both sides.
        expect(await db.select().from(schema.postComments).where(eq(schema.postComments.id, friendsCommentOnIt.id))).toEqual([]);
        expect(await db.select().from(schema.chats).where(eq(schema.chats.id, chat.id))).toEqual([]);

        const after = { profile: await friendsProfile(), post: await friendsPostRow(), comment: await friendsCommentRow() };
        expect(after.profile.numFollowers).toBe(before.profile.numFollowers - 1);
        expect(after.profile.numFollowing).toBe(before.profile.numFollowing - 1);
        expect(after.post.numComments).toBe(before.post.numComments - 1);
        expect(after.post.numSaves).toBe(before.post.numSaves - 1);
        expect(after.comment.numUpVotes).toBe(before.comment.numUpVotes - 1);
    });

    it("keeps the reports and moderation log about them, shown as a deleted account", async () => {
        const [kept] = await db.select().from(schema.postReports).where(eq(schema.postReports.id, report.id));
        expect(kept?.postId).toBe(leavingsPost.id);
        const log = await db.select().from(schema.moderationActions).where(and(eq(schema.moderationActions.subjectUserId, leaving.userId), eq(schema.moderationActions.action, "warn_user")));
        expect(log).toHaveLength(1);

        const queue = await valueOf(admin.call.admin.getReportQueue({ status: "open", limit: 100 }));
        const item = queue.find((entry) => entry.targetId === leavingsPost.id);
        expect(item?.subject).toMatchObject({ userId: leaving.userId, isDeleted: true, username: null, history: { warnings: 1 } });
        expect(await outcome(admin.call.admin.resolveReports({ kind: "post", targetId: leavingsPost.id, outcome: "removed" }))).toBe("BAD_REQUEST");
        expect(await outcome(admin.call.admin.warnUser({ userId: leaving.userId, reason: "spam" }))).toBe("NOT_FOUND");
        expect(await valueOf(admin.call.admin.resolveReports({ kind: "post", targetId: leavingsPost.id, outcome: "reviewed" }))).toEqual({ resolvedCount: 1 });
    });

    it("keeps a report after its reporter's account is deleted", async () => {
        const target = await createTestUser({ name: "target" });
        const theirPost = await valueOf(target.call.posts.createPost({ id: newId(), content: "Hello" }));
        const quitter = await createTestUser({ name: "quitter" });
        const filed = await valueOf(quitter.call.posts.reportPost({ id: newId(), postId: theirPost.id, reason: "spam", details: null }));
        await purgeAccount({ userId: quitter.userId, storage: fakeStorage().storage, logger: silentLogger });
        expect(await db.select().from(schema.postReports).where(eq(schema.postReports.id, filed.id))).toHaveLength(1);
        // Settling it tells no one (the reporter is gone), and doesn't fail.
        expect(await valueOf(admin.call.admin.resolveReports({ kind: "post", targetId: theirPost.id, outcome: "dismissed" }))).toEqual({ resolvedCount: 1 });
    });

    it("keeps a banned person's email (hashed) so it can't sign up again", async () => {
        const banned = await createTestUser({ name: "evader" });
        const [user] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, banned.userId));
        expect(await isEmailBanned({ email: user!.email })).toBe(false);
        await valueOf(admin.call.admin.banUser({ userId: banned.userId, reason: "Spam" }));
        await purgeAccount({ userId: banned.userId, storage: fakeStorage().storage, logger: silentLogger });
        expect(await isEmailBanned({ email: user!.email.toUpperCase() })).toBe(true);
        // Nobody else's.
        expect(await isEmailBanned({ email: "someone-else@example.test" })).toBe(false);
    });
});
