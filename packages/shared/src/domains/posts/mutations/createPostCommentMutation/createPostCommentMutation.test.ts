import { describe, expect, it, mock } from "bun:test";
import type { PostAccess } from "../../types/post-access";
import { mockCaller, mockPostComment, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { createPostCommentMutation } from "./createPostCommentMutation";

const postId = mockPostComment().postId;
const commentId = "01JCCCCCCCCCCCCCCCCCCCCCC9";
const postBy = (createdBy: string): PostAccess => ({ id: postId, createdBy, creator: { profileVisibility: "public" }, viewer: { followsCreator: false } });

function run({ post, content, photo = null, usable = true }: { post: PostAccess; content: string; photo?: { id: string; placeholder: string | null } | null; usable?: boolean }) {
    const sendNotifications = mock(async () => {});
    const notifyMentions = mock(async () => {});
    const publishPostCommentPhoto = mock(async ({ photoId }: { photoId: string }) => (usable ? { id: photoId, width: 1280, height: 960 } : null));
    const deletePostCommentPhotoUploads = mock(async () => {});
    const createPostComment = mock(async ({ id, userId, photo: saved }: { id: string; userId: string; photo: { id: string; width: number; height: number; placeholder: string | null } | null }) =>
        mockPostComment({ id, postId, content, createdBy: userId, photo: saved ? { ...saved, postCommentId: id, createdBy: userId, updatedBy: userId, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } : null }));
    const result = createPostCommentMutation({
        input: { id: commentId, postId, content, photo },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            getPostAccessById: async () => post,
            getPostCommentViewById: async () => null,
            createPostComment,
            sendNotifications,
            notifyMentions,
            publishPostCommentPhoto,
            deletePostCommentPhotoUploads,
        },
    });
    return { result, sendNotifications, notifyMentions, publishPostCommentPhoto, deletePostCommentPhotoUploads, createPostComment };
}

describe("createPostCommentMutation notifications", () => {
    it("tells the post's creator, and anyone else mentioned (not the creator twice)", async () => {
        const { result, sendNotifications, notifyMentions } = run({ post: postBy(userId2), content: "Love it @user2 @jo_park" });
        expect((await result).ok).toBe(true);
        expect(sendNotifications).toHaveBeenCalledWith([{
            userId: userId2,
            actorId: userId1,
            type: "commented",
            data: { postId, postCommentId: commentId, excerpt: "Love it @user2 @jo_park" },
        }]);
        expect(notifyMentions).toHaveBeenCalledWith({ actorId: userId1, postId, postCommentId: commentId, usernames: ["user2", "jo_park"], excludedUserIds: [userId2] });
    });

    it("doesn't tell you about your own comment on your own post", async () => {
        const { result, sendNotifications, notifyMentions } = run({ post: postBy(userId1), content: "Thanks all" });
        expect((await result).ok).toBe(true);
        expect(sendNotifications).not.toHaveBeenCalled();
        expect(notifyMentions).not.toHaveBeenCalled();
    });
});

describe("createPostCommentMutation photos", () => {
    const photoId = "01JPPPPPPPPPPPPPPPPPPPPPP1";

    it("publishes a photo, saves it with the comment, then deletes its uploads", async () => {
        const { result, publishPostCommentPhoto, createPostComment, deletePostCommentPhotoUploads } = run({ post: postBy(userId2), content: "", photo: { id: photoId, placeholder: "abc=" } });
        expect(await result).toMatchObject({ ok: true, value: { photo: { id: photoId, width: 1280, height: 960, placeholder: "abc=" } } });
        expect(publishPostCommentPhoto).toHaveBeenCalledWith({ userId: userId1, postCommentId: commentId, photoId });
        expect(createPostComment).toHaveBeenCalledWith(expect.objectContaining({ content: "", photo: { id: photoId, width: 1280, height: 960, placeholder: "abc=" } }));
        expect(deletePostCommentPhotoUploads).toHaveBeenCalledWith({ userId: userId1, postCommentId: commentId, photoIds: [photoId] });
    });

    it("leaves out a photo that can't be used, or refuses if there's no text either", async () => {
        const withText = run({ post: postBy(userId2), content: "Look", photo: { id: photoId, placeholder: null }, usable: false });
        expect(await withText.result).toMatchObject({ ok: true, value: { photo: null } });
        const photoOnly = run({ post: postBy(userId2), content: "", photo: { id: photoId, placeholder: null }, usable: false });
        expect(await photoOnly.result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(photoOnly.createPostComment).not.toHaveBeenCalled();
    });

    it("refuses a comment with neither text nor a photo", async () => {
        const { result } = run({ post: postBy(userId2), content: "" });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
    });
});
