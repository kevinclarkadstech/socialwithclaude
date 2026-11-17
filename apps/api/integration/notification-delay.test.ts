import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { createTestUser, type TestUser } from "./harness/createTestUser/createTestUser";
import { valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other. NOTIFICATION_DELAY_SECONDS is 0 in tests;
// the delay itself is checked by moving a notification's delivery time.
const ivy = await createTestUser({ name: "nd_ivy", visibility: "public" });
const pri = await createTestUser({ name: "nd_pri", visibility: "followers" });
const jay = await createTestUser({ name: "nd_jay", visibility: "public" });

const types = async (who: TestUser) => (await valueOf(who.call.notifications.getMine({ limit: 50 }))).items.map((item) => item.type);
const unread = async (who: TestUser) => (await valueOf(who.call.notifications.getUnreadCount({}))).count;
const deliverIn = async (userId: string, seconds: number) =>
    db.update(schema.notifications).set({ deliverAt: new Date(Date.now() + seconds * 1000) }).where(eq(schema.notifications.userId, userId));

describe("notification delay", () => {
    it("doesn't show a notification until its delivery time, in the list or on the bell", async () => {
        await valueOf(jay.call.users.follow({ username: ivy.username }));
        await deliverIn(ivy.userId, 30);
        expect(await types(ivy)).toEqual([]);
        expect(await unread(ivy)).toBe(0);
        await deliverIn(ivy.userId, -1);
        expect(await types(ivy)).toEqual(["followed"]);
        expect(await unread(ivy)).toBe(1);
    });
});

describe("undoing something hides its notification", () => {
    it("unfollowing hides 'started following you'", async () => {
        await valueOf(jay.call.users.unfollow({ username: ivy.username }));
        expect(await types(ivy)).toEqual([]);
        expect(await unread(ivy)).toBe(0);
    });

    it("unfollowing after a request was accepted hides 'accepted your follow request'", async () => {
        await valueOf(jay.call.users.follow({ username: pri.username }));
        await valueOf(pri.call.users.acceptFollowRequest({ username: jay.username }));
        expect(await types(jay)).toEqual(["follow_accepted"]);
        await valueOf(jay.call.users.unfollow({ username: pri.username }));
        expect(await types(jay)).toEqual([]);
    });

    it("editing a mention out of a post hides it", async () => {
        const post = await valueOf(jay.call.posts.createPost({ id: newId(), content: `Hi @${ivy.username}!` }));
        expect(await types(ivy)).toEqual(["mentioned"]);
        await valueOf(jay.call.posts.updatePost({ id: post.id, content: "Hi everyone!", media: [] }));
        expect(await types(ivy)).toEqual([]);
    });

    it("editing a mention out of a comment hides it, and a longer username doesn't count", async () => {
        const post = await valueOf(jay.call.posts.createPost({ id: newId(), content: "Weekend plans" }));
        const comment = await valueOf(jay.call.postComments.createPostComment({ id: newId(), postId: post.id, content: `@${ivy.username} you in?` }));
        expect(await types(ivy)).toEqual(["mentioned"]);
        await valueOf(jay.call.postComments.updatePostComment({ id: comment.id, content: `@${ivy.username}_2 you in?` }));
        expect(await types(ivy)).toEqual([]);
    });
});
