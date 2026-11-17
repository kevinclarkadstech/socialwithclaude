import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { createTestUser, type TestUser } from "./harness/createTestUser/createTestUser";
import { valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const pia = await createTestUser({ name: "sn_pia", visibility: "public" });
const pri = await createTestUser({ name: "sn_pri", visibility: "followers" });
const al = await createTestUser({ name: "sn_al", visibility: "public" });
const bo = await createTestUser({ name: "sn_bo", visibility: "public" });

// Each as [type, who did it, data].
const mine = async (who: TestUser): Promise<unknown[][]> =>
    (await valueOf(who.call.notifications.getMine({ limit: 50 }))).items.map((item) => [item.type, item.actor?.username ?? null, item.data]);
const unread = async (who: TestUser) => (await valueOf(who.call.notifications.getUnreadCount({}))).count;

describe("follow notifications", () => {
    it("tell a public account who followed them, once a day however often", async () => {
        await valueOf(al.call.users.follow({ username: pia.username }));
        await valueOf(al.call.users.unfollow({ username: pia.username }));
        await valueOf(al.call.users.follow({ username: pia.username }));
        expect(await mine(pia)).toEqual([["followed", al.username, {}]]);
    });

    it("tell a followers-only account who asked, and the asker when it's accepted", async () => {
        await valueOf(al.call.users.follow({ username: pri.username }));
        expect(await mine(pri)).toEqual([["follow_requested", al.username, {}]]);
        await valueOf(pri.call.users.acceptFollowRequest({ username: al.username }));
        expect(await mine(al)).toEqual([["follow_accepted", pri.username, {}]]);
        // The request stays in the list once accepted.
        expect((await mine(pri)).length).toBe(1);
    });

    it("drop a request once it's withdrawn", async () => {
        await valueOf(bo.call.users.follow({ username: pri.username }));
        expect(await unread(pri)).toBe(2);
        await valueOf(bo.call.users.unfollow({ username: pri.username }));
        expect((await mine(pri)).map(([, actor]) => actor)).not.toContain(bo.username);
        expect(await unread(pri)).toBe(1);
    });
});

const post = await valueOf(pia.call.posts.createPost({ id: newId(), content: "Sunset at the pier" }));

describe("comment and mention notifications", () => {
    it("tell a post's creator about a comment, and whoever it mentions", async () => {
        const comment = await valueOf(bo.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "Wow, look @" + al.username + " and @" + pia.username }));
        expect((await mine(pia))[0]).toEqual(["commented", bo.username, { postId: post.id, postCommentId: comment.id, excerpt: comment.content }]);
        // Pia was mentioned too, but is told once (as the creator).
        expect((await mine(pia)).filter(([type]) => type === "mentioned")).toEqual([]);
        expect(await mine(al)).toContainEqual(["mentioned", bo.username, { postId: post.id, postCommentId: comment.id }]);
    });

    it("tell only people an edit newly mentions", async () => {
        const comment = await valueOf(al.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "Nice" }));
        await valueOf(al.call.postComments.updatePostComment({ id: comment.id, content: "Nice @" + bo.username }));
        await valueOf(al.call.postComments.updatePostComment({ id: comment.id, content: "Nice @" + bo.username + "!" }));
        expect((await mine(bo)).filter(([type]) => type === "mentioned")).toEqual([["mentioned", al.username, { postId: post.id, postCommentId: comment.id }]]);
    });

    it("don't tell people mentioned in a followers-only post they can't see", async () => {
        const privatePost = await valueOf(pri.call.posts.createPost({ id: newId(), content: "Followers only: hi @" + al.username + " and @" + bo.username }));
        expect(await mine(al)).toContainEqual(["mentioned", pri.username, { postId: privatePost.id, postCommentId: null }]);
        expect((await mine(bo)).map(([, , data]) => data)).not.toContainEqual({ postId: privatePost.id, postCommentId: null });
    });

    it("hide what's from someone blocked, and what's been deleted", async () => {
        const before = (await mine(pia)).filter(([, actor]) => actor === bo.username).length;
        expect(before).toBeGreaterThan(0);
        await valueOf(pia.call.users.blockUser({ username: bo.username }));
        expect((await mine(pia)).filter(([, actor]) => actor === bo.username)).toEqual([]);
        await valueOf(pia.call.users.unblockUser({ username: bo.username }));
        expect((await mine(pia)).filter(([, actor]) => actor === bo.username).length).toBe(before);
        await valueOf(pia.call.posts.deletePost({ id: post.id }));
        expect((await mine(pia)).filter(([type]) => type === "commented")).toEqual([]);
    });
});
