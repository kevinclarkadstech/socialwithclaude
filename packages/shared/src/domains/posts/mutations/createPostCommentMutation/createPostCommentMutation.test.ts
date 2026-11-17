import { describe, expect, it, mock } from "bun:test";
import type { PostAccess } from "../../types/post-access";
import { mockCaller, mockPostComment, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { createPostCommentMutation } from "./createPostCommentMutation";

const postId = mockPostComment().postId;
const commentId = "01JCCCCCCCCCCCCCCCCCCCCCC9";
const postBy = (createdBy: string): PostAccess => ({ id: postId, createdBy, creator: { profileVisibility: "public" }, viewer: { followsCreator: false } });

function run({ post, content }: { post: PostAccess; content: string }) {
    const sendNotifications = mock(async () => {});
    const notifyMentions = mock(async () => {});
    const result = createPostCommentMutation({
        input: { id: commentId, postId, content },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            getPostAccessById: async () => post,
            getPostCommentViewById: async () => null,
            createPostComment: async ({ id, userId }) => mockPostComment({ id, postId, content, createdBy: userId }),
            sendNotifications,
            notifyMentions,
        },
    });
    return { result, sendNotifications, notifyMentions };
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
