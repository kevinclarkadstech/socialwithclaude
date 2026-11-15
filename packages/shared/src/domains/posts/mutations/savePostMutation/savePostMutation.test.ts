import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../../types/post";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { savePostMutation } from "./savePostMutation";

function run(post: PostView | null) {
    const savePost = mock(async () => true);
    const result = savePostMutation({
        input: { postId: mockPost().id },
        context: testContext,
        dependencies: { getCallingUser: async () => mockCaller(), getPostViewById: async () => post, savePost },
    });
    return { result, savePost };
}

describe("savePostMutation", () => {
    it("saves a post the caller can see", async () => {
        const { result, savePost } = run(mockPost());
        expect((await result).ok).toBe(true);
        expect(savePost).toHaveBeenCalledWith({ userId: mockCaller().userId, postId: mockPost().id });
    });

    it("refuses a post the caller can't see", async () => {
        const hidden = mockPost({
            createdBy: userId2,
            creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
        });
        const { result, savePost } = run(hidden);
        expect((await result).ok).toBe(false);
        expect(savePost).not.toHaveBeenCalled();
    });

    it("is not found for a missing post", async () => {
        const { result } = run(null);
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});
