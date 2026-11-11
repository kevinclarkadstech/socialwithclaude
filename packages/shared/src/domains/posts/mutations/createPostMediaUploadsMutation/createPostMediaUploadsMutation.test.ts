import { describe, expect, it } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { mediaId, postPhotoKey, secondMediaId } from "../../../../testing/postMedia";
import { createPostMediaUploadsMutation } from "./createPostMediaUploadsMutation";

const caller = mockCaller();
const post = mockPost();

describe("createPostMediaUploadsMutation", () => {
    const create = ({ media, postingEnabled = true, existing = null, as = caller }: {
        media: { mediaId: string; sizes: number[] }[];
        postingEnabled?: boolean;
        existing?: ReturnType<typeof mockPost> | null;
        as?: ReturnType<typeof mockCaller>;
    }) => createPostMediaUploadsMutation({
        input: {
            postId: post.id,
            media: media.map(({ mediaId: id, sizes }) => ({ mediaId: id, files: sizes.map((size) => ({ size, contentType: "image/webp" as const, contentLength: 1000 })) })),
        },
        context: testContext,
        dependencies: {
            getCallingUser: async () => as,
            isPostingEnabled: () => postingEnabled,
            getPostById: async () => existing,
            createUploadUrl: async ({ key: uploadKey }: { key: string }) => `https://storage.test/${uploadKey}?signed`,
        },
    });
    const sizes = [320, 640, 1280];

    it("hands out an upload URL per size of every photo, under the caller's and the post's ids, in one call", async () => {
        const result = await create({ media: [{ mediaId, sizes }, { mediaId: secondMediaId, sizes }] });
        expect(result.ok && result.value.uploads.map((upload) => upload.url)).toEqual(
            [mediaId, secondMediaId].flatMap((id) => sizes.map((size) => `https://storage.test/${postPhotoKey(id, size)}?signed`)),
        );
    });

    it("works for the caller's own post being edited, but not someone else's", async () => {
        expect(await create({ media: [{ mediaId, sizes }], existing: post })).toMatchObject({ ok: true });
        expect(await create({ media: [{ mediaId, sizes }], existing: post, as: mockCaller({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });

    it("refuses anything but one file at each size, repeated photos, or posting turned off", async () => {
        expect(await create({ media: [{ mediaId, sizes: [320, 1280] }] })).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await create({ media: [{ mediaId, sizes }, { mediaId, sizes }] })).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await create({ media: [{ mediaId, sizes }], postingEnabled: false })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
