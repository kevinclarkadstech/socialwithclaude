import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockPost, now, userId2 } from "../../../testing/fixtures";
import { silentLogger, testContext } from "../../../testing/context";
import { mockJpeg } from "../../../testing/images";
import type { PostMedia } from "../types/post-media";
import { publishPostPhotos } from "../utils/publishPostPhotos";
import { createPostMediaUploadsMutation } from "./createPostMediaUploadsMutation";
import { createPostMutation } from "./createPostMutation";
import { deletePostMutation } from "./deletePostMutation";
import { updatePostMutation } from "./updatePostMutation";

const caller = mockCaller();
const userId = caller.userId;
const post = mockPost();
const mediaId = "01JMMMMMMMMMMMMMMMMMMMMMM1";
const second = "01JMMMMMMMMMMMMMMMMMMMMMM2";
const key = (id: string, size: number, postId = post.id) => `${userId}/${postId}/${id}-${size}`;
const field = (id: string, caption: string | null = null) => ({ id, caption, width: 1280, height: 960, placeholder: null });

function onPost(id: string, position: number): PostMedia {
    return {
        id,
        postId: post.id,
        position,
        caption: null,
        width: 1280,
        height: 960,
        placeholder: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
    };
}

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
        const result = await create({ media: [{ mediaId, sizes }, { mediaId: second, sizes }] });
        expect(result.ok && result.value.uploads.map((upload) => upload.url)).toEqual(
            [mediaId, second].flatMap((id) => sizes.map((size) => `https://storage.test/${key(id, size)}?signed`)),
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

describe("publishPostPhotos", () => {
    function publish(uploads: Record<string, Uint8Array | null>, ids = [mediaId]) {
        const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        const result = publishPostPhotos({
            userId,
            postId: post.id,
            media: ids.map((id) => ({ id })),
            logger: silentLogger,
            storage: { readUpload: async ({ key: uploadKey }) => uploads[uploadKey] ?? null, putMedia, deleteUploads },
        });
        return { result, putMedia, deleteUploads };
    }
    const landscape = (id: string) => ({ [key(id, 320)]: mockJpeg(320, 240), [key(id, 640)]: mockJpeg(640, 480), [key(id, 1280)]: mockJpeg(1280, 960) });

    it("publishes every size at the same key without metadata, and clears the uploads", async () => {
        const { result, putMedia, deleteUploads } = publish(landscape(mediaId));
        expect(await result).toEqual([{ id: mediaId, width: 1280, height: 960 }]);
        expect(putMedia.mock.calls.map(([args]) => args.key)).toEqual([320, 640, 1280].map((size) => key(mediaId, size)));
        for (const [args] of putMedia.mock.calls) {
            expect(new TextDecoder().decode(args.bytes)).not.toContain("GPS");
        }
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => key(mediaId, size)) });
    });

    it("takes portrait photos by their longer side", async () => {
        const { result } = publish({ [key(mediaId, 320)]: mockJpeg(240, 320), [key(mediaId, 640)]: mockJpeg(480, 640), [key(mediaId, 1280)]: mockJpeg(960, 1280) });
        expect(await result).toEqual([{ id: mediaId, width: 960, height: 1280 }]);
    });

    it("leaves out a photo that's missing, mis-sized, mismatched, too thin or not an image, publishing the rest", async () => {
        for (const bad of [
            { [key(second, 640)]: null },
            { [key(second, 640)]: mockJpeg(600, 450) },
            { [key(second, 320)]: mockJpeg(320, 320) },
            { [key(second, 320)]: mockJpeg(320, 80), [key(second, 640)]: mockJpeg(640, 160), [key(second, 1280)]: mockJpeg(1280, 320) },
            { [key(second, 1280)]: new Uint8Array([60, 104, 116, 109, 108, 62]) },
        ]) {
            const { result, putMedia, deleteUploads } = publish({ ...landscape(mediaId), ...landscape(second), ...bad }, [mediaId, second]);
            expect(await result).toEqual([{ id: mediaId, width: 1280, height: 960 }]);
            expect(putMedia.mock.calls.every(([args]) => args.key.includes(mediaId))).toBe(true);
            expect(deleteUploads.mock.calls[0]![0].keys).toHaveLength(6);
        }
    });
});

describe("photos on posts", () => {
    function create({ content = "", media, published = media.map(({ id }) => ({ id, width: 1280, height: 960 })) }: {
        content?: string;
        media: ReturnType<typeof field>[];
        published?: { id: string; width: number; height: number }[];
    }) {
        const createPost = mock(async () => post);
        const publishPostPhotos = mock(async () => published);
        const result = createPostMutation({
            input: { id: post.id, content, media },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                isPostingEnabled: () => true,
                getPostById: async () => null,
                publishPostPhotos,
                createPost,
            },
        });
        return { result, createPost, publishPostPhotos };
    }

    it("creates a photo-only post: publishes its photos under its id, saves them in order with real sizes, blank captions as none", async () => {
        const { result, createPost, publishPostPhotos } = create({
            media: [field(second, "  "), field(mediaId, " The view ")],
            published: [{ id: mediaId, width: 960, height: 1280 }, { id: second, width: 1280, height: 427 }],
        });
        expect(await result).toMatchObject({ ok: true });
        expect(publishPostPhotos).toHaveBeenCalledWith({ userId, postId: post.id, media: [field(second, "  "), field(mediaId, " The view ")] });
        expect(createPost).toHaveBeenCalledWith({
            id: post.id,
            content: "",
            userId,
            media: [
                { id: second, position: 0, caption: null, width: 1280, height: 427, placeholder: null },
                { id: mediaId, position: 1, caption: "The view", width: 960, height: 1280, placeholder: null },
            ],
        });
    });

    it("leaves off a photo that couldn't be published, numbering the rest from 0", async () => {
        const { result, createPost } = create({ content: "Hi", media: [field(mediaId), field(second)], published: [{ id: second, width: 1280, height: 960 }] });
        expect(await result).toMatchObject({ ok: true });
        expect(createPost).toHaveBeenCalledWith({
            id: post.id,
            content: "Hi",
            userId,
            media: [{ id: second, position: 0, caption: null, width: 1280, height: 960, placeholder: null }],
        });
    });

    it("refuses a post with nothing in it, or whose only photos didn't upload", async () => {
        const empty = create({ content: "  ", media: [] });
        expect(await empty.result).toMatchObject({ ok: false, error: { type: "validation" } });
        const lost = create({ media: [field(mediaId)], published: [] });
        expect(await lost.result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(lost.createPost).not.toHaveBeenCalled();
    });

    it("refuses the same photo twice", async () => {
        const { result, publishPostPhotos } = create({ content: "Hi", media: [field(mediaId), field(mediaId)] });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(publishPostPhotos).not.toHaveBeenCalled();
    });

    it("on an edit, publishes only new photos, keeps and reorders the rest, and deletes removed ones' files", async () => {
        const kept = "01JMMMMMMMMMMMMMMMMMMMMMM3";
        const removed = "01JMMMMMMMMMMMMMMMMMMMMMM4";
        const existing = mockPost({ media: [onPost(kept, 0), onPost(removed, 1)] });
        const updatePost = mock(async () => existing);
        const publishPostPhotos = mock(async () => [{ id: mediaId, width: 960, height: 1280 }]);
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await updatePostMutation({
            input: { id: post.id, content: "Edited", media: [field(mediaId), field(kept, "Kept")] },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, getPostById: async () => existing, publishPostPhotos, deleteMedia, updatePost },
        });
        expect(result).toMatchObject({ ok: true });
        expect(publishPostPhotos).toHaveBeenCalledWith({ userId, postId: post.id, media: [field(mediaId)] });
        expect(updatePost).toHaveBeenCalledWith({
            id: post.id,
            content: "Edited",
            userId,
            media: [
                { id: mediaId, position: 0, caption: null, width: 960, height: 1280, placeholder: null },
                { id: kept, position: 1, caption: "Kept", width: 1280, height: 960, placeholder: null },
            ],
            removedMediaIds: [removed],
        });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => key(removed, size)) });
    });

    it("deletes a deleted post's photo files", async () => {
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await deletePostMutation({
            input: { id: post.id },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostById: async () => mockPost({ media: [onPost(mediaId, 0)] }),
                deletePost: async () => true,
                deleteMedia,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => key(mediaId, size)) });
    });
});
