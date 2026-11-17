import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { createNotifications, createPostComment, getLivePostMediaIds } from "../src/data-access";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// Publishing a photo needs object storage, which CI doesn't run: these save a published photo
// straight through the data layer, and check everything around it through the API.
const ola = await createTestUser({ name: "cp_ola", visibility: "public" });
const pat = await createTestUser({ name: "cp_pat", visibility: "public" });
const post = await valueOf(ola.call.posts.createPost({ id: newId(), content: "Garden update" }));

const commentId = newId();
const photoId = newId();
await createPostComment({ id: commentId, postId: post.id, userId: pat.userId, content: "", photo: { id: photoId, width: 1280, height: 960, placeholder: "abc=" } });

const comments = async () => (await valueOf(ola.call.postComments.getPostComments({ postId: post.id, limit: 20 }))).items;

describe("comment photos", () => {
    it("show with the comment, and a photo-only comment is fine", async () => {
        const [comment] = await comments();
        expect(comment).toMatchObject({ id: commentId, content: "", photo: { id: photoId, postCommentId: commentId, width: 1280, height: 960, placeholder: "abc=", createdBy: pat.userId } });
    });

    it("are kept by the orphan sweep while the comment is live", async () => {
        expect(await getLivePostMediaIds({ photoIds: [photoId] })).toEqual(new Set([`${commentId}/${photoId}`]));
    });

    it("show as a thumbnail on the comment's notification", async () => {
        await createNotifications([{ userId: ola.userId, actorId: pat.userId, type: "commented", data: { postId: post.id, postCommentId: commentId, excerpt: "" } }]);
        const [notification] = (await valueOf(ola.call.notifications.getMine({ limit: 10 }))).items;
        expect(notification).toMatchObject({ type: "commented", commentPhoto: { id: photoId } });
    });

    it("can be removed by editing, but not leaving the comment empty", async () => {
        expect(await outcome(pat.call.postComments.updatePostComment({ id: commentId, content: "", photo: null }))).toBe("BAD_REQUEST");
        await valueOf(pat.call.postComments.updatePostComment({ id: commentId, content: "Tomatoes!", photo: null }));
        const [comment] = await comments();
        expect(comment).toMatchObject({ content: "Tomatoes!", photo: null });
        expect(await getLivePostMediaIds({ photoIds: [photoId] })).toEqual(new Set());
    });

    it("an edit that leaves the photo out keeps it", async () => {
        const otherId = newId();
        const otherPhoto = newId();
        await createPostComment({ id: otherId, postId: post.id, userId: pat.userId, content: "Before", photo: { id: otherPhoto, width: 640, height: 640, placeholder: null } });
        await valueOf(pat.call.postComments.updatePostComment({ id: otherId, content: "After" }));
        expect((await comments()).find((comment) => comment.id === otherId)).toMatchObject({ content: "After", photo: { id: otherPhoto } });
    });

    it("refuse a comment with neither text nor a photo", async () => {
        expect(await outcome(pat.call.postComments.createPostComment({ id: newId(), postId: post.id, content: "" }))).toBe("BAD_REQUEST");
    });

    it("upload URLs are only for posts you can comment on, or your own comments", async () => {
        const files = [320, 640, 1280].map((size) => ({ size, contentType: "image/webp" as const, contentLength: 1000 }));
        const urls = await valueOf(pat.call.postComments.createPostCommentPhotoUpload({ postId: post.id, postCommentId: newId(), photoId: newId(), files }));
        expect(urls.uploads.map((upload) => upload.size)).toEqual([320, 640, 1280]);
        // Ola can't add a photo to Pat's comment.
        expect(await outcome(ola.call.postComments.createPostCommentPhotoUpload({ postId: post.id, postCommentId: commentId, photoId: newId(), files }))).toBe("FORBIDDEN");
    });
});
