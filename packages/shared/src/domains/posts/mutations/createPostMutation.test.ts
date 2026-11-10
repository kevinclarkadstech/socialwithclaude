import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../types/post";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { createPostMutation } from "./createPostMutation";

const post = mockPost();

function run({ created, existing }: { created: PostView | null; existing: PostView | null }) {
    const createPost = mock(async () => created);
    const result = createPostMutation({
        input: { id: post.id, content: post.content, media: [] },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            isPostingEnabled: () => true,
            getPostViewById: async () => existing,
            publishPostPhotos: async () => [],
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

describe("createPostMutation for a listing", () => {
    it("passes the listing's details on to be saved with the post", async () => {
        const listing = { title: "Bookshelf", description: "Solid wood", condition: "used" as const, isNegotiable: false, type: "fixed" as const, priceCents: 2500 };
        const createPost = mock(async () => post);
        const result = await createPostMutation({
            input: { id: post.id, content: "Solid wood", media: [], listing },
            context: testContext,
            dependencies: {
                getCallingUser: async () => mockCaller(),
                isPostingEnabled: () => true,
                getPostViewById: async () => null,
                publishPostPhotos: async () => [],
                createPost,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ listing }));
    });
});
