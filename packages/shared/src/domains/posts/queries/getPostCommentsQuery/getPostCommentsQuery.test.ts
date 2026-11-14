import { describe, expect, it, mock } from "bun:test";
import type { CallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { getPostCommentsQuery } from "./getPostCommentsQuery";

function run({ caller, post }: { caller: CallingUser | null; post: PostView | null }) {
    const getPostCommentViews = mock(async () => ({ items: [], nextCursor: null }));
    const result = getPostCommentsQuery({
        input: { postId: mockPost().id, limit: 20, order: "oldest" },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getPostViewById: async () => post,
            getPostCommentViews,
        },
    });
    return { result, getPostCommentViews };
}

const privatePost = mockPost({ creator: { ...mockPost().creator, profileVisibility: "followers" } });

describe("getPostCommentsQuery", () => {
    it("returns the comments to someone who has finished sign-up", async () => {
        const { result, getPostCommentViews } = run({ caller: mockCaller({ userId: userId2 }), post: mockPost() });
        expect((await result).ok).toBe(true);
        expect(getPostCommentViews).toHaveBeenCalled();
    });

    it("needs a signed-in user", async () => {
        const { result, getPostCommentViews } = run({ caller: null, post: mockPost() });
        expect(await result).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(getPostCommentViews).not.toHaveBeenCalled();
    });

    it("needs sign-up to be finished", async () => {
        const { result } = run({ caller: mockCaller({ profile: null }), post: mockPost() });
        expect(await result).toMatchObject({ ok: false, error: { type: "authorization" } });
    });

    it("is not found for a post the caller can't see", async () => {
        const { result, getPostCommentViews } = run({ caller: mockCaller({ userId: userId2 }), post: privatePost });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(getPostCommentViews).not.toHaveBeenCalled();
    });

    it("is not found for a missing post", async () => {
        const { result } = run({ caller: mockCaller(), post: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});
