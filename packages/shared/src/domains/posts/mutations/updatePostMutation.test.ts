import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { updatePostMutation } from "./updatePostMutation";

const post = mockPost();

function run(caller: ReturnType<typeof mockCaller> | null, existing = post) {
    const updatePost = mock(async ({ content }: { content: string }) => ({ ...existing, content }));
    const result = updatePostMutation({
        input: { id: post.id, content: "Edited", media: [] },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getPostById: async () => existing,
            getPostMediaByIds: async () => [],
            deleteMedia: async () => {},
            updatePost,
        },
    });
    return { result, updatePost };
}

describe("updatePostMutation", () => {
    it("lets the author edit their post", async () => {
        const { result, updatePost } = run(mockCaller());
        expect(await result).toMatchObject({ ok: true, value: { content: "Edited" } });
        expect(updatePost).toHaveBeenCalledWith({ id: post.id, content: "Edited", media: [], removedMediaIds: [], userId: mockCaller().userId });
    });

    it("refuses someone else, without saving", async () => {
        const { result, updatePost } = run(mockCaller({ userId: userId2 }));
        expect(await result).toMatchObject({ ok: false, error: { type: "authorization" } });
        expect(updatePost).not.toHaveBeenCalled();
    });

    it("is not found when the post doesn't exist", async () => {
        const result = await updatePostMutation({
            input: { id: post.id, content: "Edited", media: [] },
            context: testContext,
            dependencies: {
                getCallingUser: async () => mockCaller(),
                getPostById: async () => null,
                getPostMediaByIds: async () => [],
                deleteMedia: async () => {},
                updatePost: async () => null,
            },
        });
        expect(result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});
