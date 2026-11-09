import { describe, expect, it, mock } from "bun:test";
import type { Post } from "../types/post";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { createPostMutation } from "./createPostMutation";

const post = mockPost();

function run({ created, existing }: { created: Post | null; existing: Post | null }) {
    const createPost = mock(async () => created);
    const result = createPostMutation({
        input: { id: post.id, content: post.content, media: [] },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            isPostingEnabled: () => true,
            getPostById: async () => existing,
            getPostMediaByIds: async () => [],
            createPost,
        },
    });
    return { result, createPost };
}

describe("createPostMutation", () => {
    it("creates the post", async () => {
        const { result } = run({ created: post, existing: null });
        expect(await result).toEqual({ ok: true, value: post });
    });

    it("returns the caller's post when a create is retried with the same id", async () => {
        const { result } = run({ created: null, existing: post });
        expect(await result).toEqual({ ok: true, value: post });
    });

    it("fails with a conflict when the id belongs to someone else's post", async () => {
        const { result } = run({ created: null, existing: mockPost({ createdBy: userId2 }) });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
    });

    it("fails with a conflict when the id was used by something since deleted", async () => {
        const { result } = run({ created: null, existing: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
    });
});
