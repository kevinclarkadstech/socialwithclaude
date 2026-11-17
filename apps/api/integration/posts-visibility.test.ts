import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests in each file run in order and build on each other.
const jo = await createTestUser({ name: "jo", visibility: "followers" });
const maya = await createTestUser({ name: "maya" });
const postId = newId();
await jo.call.posts.createPost({ id: postId, content: "Only my followers can see this" });
const feedIds = async () => (await valueOf(maya.call.posts.getFeed({ limit: 50 }))).items.map((post) => post.id);

describe("a followers-only account's posts", () => {
    it("are hidden from someone who doesn't follow them", async () => {
        expect(await outcome(maya.call.posts.getPostById({ postId }))).toBe("NOT_FOUND");
        expect(await feedIds()).not.toContain(postId);
        expect(await outcome(maya.call.postComments.getPostComments({ postId, limit: 20 }))).toBe("NOT_FOUND");
        expect(await outcome(maya.call.posts.save({ postId }))).toBe("NOT_FOUND");
        expect(await outcome(maya.call.postComments.createPostComment({ id: newId(), postId, content: "Hi" }))).toBe("NOT_FOUND");
    });

    it("are hidden while a follow request waits, and shown once it's accepted", async () => {
        await maya.call.users.follow({ username: jo.username });
        expect(await outcome(maya.call.posts.getPostById({ postId }))).toBe("NOT_FOUND");
        await jo.call.users.acceptFollowRequest({ username: maya.username });
        expect(await outcome(maya.call.posts.getPostById({ postId }))).toBe("OK");
        expect(await feedIds()).toContain(postId);
    });

    it("are shown to their author, and need sign-in for anything else", async () => {
        expect(await outcome(jo.call.posts.getPostById({ postId }))).toBe("OK");
        expect(await outcome(callAs(null).posts.getPostById({ postId }))).toBe("NOT_FOUND");
        expect(await outcome(callAs(null).posts.save({ postId }))).toBe("UNAUTHORIZED");
    });
});
