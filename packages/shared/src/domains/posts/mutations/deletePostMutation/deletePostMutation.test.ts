import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockPost } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { mediaId, photoOnPost, postPhotoKey } from "../../../../testing/postMedia";
import { deletePostMutation } from "./deletePostMutation";

const caller = mockCaller();
const post = mockPost();

describe("deletePostMutation", () => {
    it("deletes a deleted post's photo files", async () => {
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await deletePostMutation({
            input: { id: post.id },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostById: async () => mockPost(),
                getPostMediaByPostId: async () => [photoOnPost(mediaId)],
                deletePost: async () => true,
                deleteMedia,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => postPhotoKey(mediaId, size)) });
    });
});
