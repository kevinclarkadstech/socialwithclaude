import { describe, expect, it } from "bun:test";
import { and, inArray } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const sam = await createTestUser({ name: "sam", firstName: "Samuel" });
const maya = await createTestUser({ name: "maya", firstName: "Maya" });
const samsPost = newId();
await sam.call.posts.createPost({ id: samsPost, content: "Bike for sale, barely used" });
const mayasPost = newId();
await maya.call.posts.createPost({ id: mayasPost, content: "New apartment" });
const samsComment = newId();
await sam.call.postComments.createPostComment({ id: samsComment, postId: mayasPost, content: "Looks great" });
// They follow each other, so the block has follows to end.
await sam.call.users.follow({ username: maya.username });
await maya.call.users.follow({ username: sam.username });

const feedIds = async () => (await valueOf(maya.call.posts.getFeed({ limit: 50 }))).items.map((post) => post.id);
const commentIds = async () => (await valueOf(maya.call.postComments.getPostComments({ postId: mayasPost, limit: 20 }))).items.map((comment) => comment.id);
const followsBetween = async () => {
    const ids = [sam.userId, maya.userId];
    const rows = await db.select().from(schema.userFollows).where(and(inArray(schema.userFollows.followerId, ids), inArray(schema.userFollows.followingId, ids)));
    return rows.length;
};
const usernames = (users: { username: string }[]) => users.map((user) => user.username);

describe("before a block", () => {
    it("each sees the other's posts, comments and profile", async () => {
        expect(await feedIds()).toContain(samsPost);
        expect(await commentIds()).toContain(samsComment);
        expect(await outcome(maya.call.users.getUserProfile({ username: sam.username }))).toBe("OK");
    });
});

describe("when Sam blocks Maya", () => {
    it("ends the follows both ways", async () => {
        expect(await followsBetween()).toBe(2);
        await sam.call.users.blockUser({ username: maya.username });
        expect(await followsBetween()).toBe(0);
    });

    it("hides Sam from Maya: profile, posts, comments, search and mentions", async () => {
        expect(await outcome(maya.call.users.getUserProfile({ username: sam.username }))).toBe("NOT_FOUND");
        expect(await outcome(maya.call.posts.getPostById({ postId: samsPost }))).toBe("NOT_FOUND");
        expect(await feedIds()).not.toContain(samsPost);
        expect(await commentIds()).not.toContain(samsComment);
        expect(usernames(await valueOf(maya.call.users.search({ query: "sam" })))).not.toContain(sam.username);
        expect(usernames(await valueOf(maya.call.users.suggestMentions({ query: "sam" })))).not.toContain(sam.username);
        expect((await valueOf(maya.call.posts.search({ query: "bike", limit: 20 }))).items.map((post) => post.id)).not.toContain(samsPost);
    });

    it("stops Maya acting on Sam's comment under her own post, except reporting it", async () => {
        expect(await outcome(maya.call.postComments.setPostCommentVote({ postCommentId: samsComment, value: 1 }))).toBe("NOT_FOUND");
        expect(await outcome(maya.call.postComments.save({ postCommentId: samsComment }))).toBe("NOT_FOUND");
        // A block doesn't stop a report (see reports.test.ts).
        expect(await outcome(maya.call.postComments.reportPostComment({ id: newId(), postCommentId: samsComment, reason: "spam", details: null }))).toBe("OK");
    });

    it("stops Maya messaging Sam", async () => {
        expect(await outcome(maya.call.chats.getOrCreateDirectChat({ id: newId(), username: sam.username }))).not.toBe("OK");
    });
});

describe("after Sam unblocks Maya", () => {
    it("shows everything again, but the follows stay ended", async () => {
        await sam.call.users.unblockUser({ username: maya.username });
        expect(await feedIds()).toContain(samsPost);
        expect(await commentIds()).toContain(samsComment);
        const profile = await valueOf(maya.call.users.getUserProfile({ username: sam.username }));
        expect(profile.viewer.followStatus).toBe("none");
        expect(await outcome(maya.call.postComments.setPostCommentVote({ postCommentId: samsComment, value: 1 }))).toBe("OK");
    });
});
