import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome } from "./harness/outcome/outcome";

const jo = await createTestUser({ name: "jo", visibility: "followers" });
const maya = await createTestUser({ name: "maya" });
const josPost = newId();
await jo.call.posts.createPost({ id: josPost, content: "Followers only" });
const josComment = newId();
await jo.call.postComments.createPostComment({ id: josComment, postId: josPost, content: "And a comment" });
const mayasPost = newId();
await maya.call.posts.createPost({ id: mayasPost, content: "Public" });
const mayasComment = newId();
await maya.call.postComments.createPostComment({ id: mayasComment, postId: mayasPost, content: "Mine" });

describe("acting on a comment", () => {
    it("is not found under a post the caller can't see, except reporting it", async () => {
        expect(await outcome(maya.call.postComments.setPostCommentVote({ postCommentId: josComment, value: 1 }))).toBe("NOT_FOUND");
        expect(await outcome(maya.call.postComments.save({ postCommentId: josComment }))).toBe("NOT_FOUND");
        // A report shows nothing back (see reports.test.ts).
        expect(await outcome(maya.call.postComments.reportPostComment({ id: newId(), postCommentId: josComment, reason: "spam", details: null }))).toBe("OK");
    });

    it("works on a post the caller can see", async () => {
        expect(await outcome(jo.call.postComments.setPostCommentVote({ postCommentId: mayasComment, value: 1 }))).toBe("OK");
        expect(await outcome(jo.call.postComments.reportPostComment({ id: newId(), postCommentId: mayasComment, reason: "spam", details: null }))).toBe("OK");
        expect(await outcome(jo.call.postComments.save({ postCommentId: mayasComment }))).toBe("OK");
    });

    it("asks a signed-out caller to sign in", async () => {
        expect(await outcome(callAs(null).postComments.setPostCommentVote({ postCommentId: mayasComment, value: 1 }))).toBe("UNAUTHORIZED");
    });
});
