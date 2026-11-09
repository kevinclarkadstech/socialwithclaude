import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { mockJpeg } from "../../../testing/images";
import type { UploadedPostMedia } from "../types/post-media";
import { confirmPostMediaUploadsMutation } from "./confirmPostMediaUploadsMutation";
import { createPostMediaUploadsMutation } from "./createPostMediaUploadsMutation";
import { createPostMutation } from "./createPostMutation";
import { deletePostMutation } from "./deletePostMutation";
import { updatePostMutation } from "./updatePostMutation";

const caller = mockCaller();
const mediaId = "01JMMMMMMMMMMMMMMMMMMMMMM1";
const uploadKey = (size: number) => `${caller.userId}/post-media/${mediaId}/${size}`;

function uploaded(overrides: Partial<UploadedPostMedia> = {}): UploadedPostMedia {
    return {
        id: mediaId,
        path: `post-media/${mediaId}/token`,
        width: 1280,
        height: 960,
        placeholder: null,
        postId: null,
        createdBy: caller.userId,
        ...overrides,
    };
}

describe("createPostMediaUploadsMutation", () => {
    const second = "01JMMMMMMMMMMMMMMMMMMMMMM2";
    const create = (media: { mediaId: string; sizes: number[] }[], postingEnabled = true) => createPostMediaUploadsMutation({
        input: { media: media.map(({ mediaId, sizes }) => ({ mediaId, files: sizes.map((size) => ({ size, contentType: "image/webp" as const, contentLength: 1000 })) })) },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            isPostingEnabled: () => postingEnabled,
            createUploadUrl: async ({ key }: { key: string }) => `https://storage.test/${key}?signed`,
        },
    });

    it("hands out an upload URL per size of every photo, under the caller's id, in one call", async () => {
        const result = await create([{ mediaId, sizes: [320, 640, 1280] }, { mediaId: second, sizes: [320, 640, 1280] }]);
        expect(result.ok && result.value.uploads.map((upload) => [upload.mediaId, upload.size])).toEqual(
            [mediaId, second].flatMap((id) => [320, 640, 1280].map((size) => [id, size])),
        );
        expect(result.ok && result.value.uploads[0]!.url).toBe(`https://storage.test/${uploadKey(320)}?signed`);
    });

    it("refuses anything but one file at each size, repeated photos, or posting turned off", async () => {
        expect(await create([{ mediaId, sizes: [320, 1280] }])).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await create([{ mediaId, sizes: [320, 640, 1280] }, { mediaId, sizes: [320, 640, 1280] }])).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await create([{ mediaId, sizes: [320, 640, 1280] }], false)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe("confirmPostMediaUploadsMutation", () => {
    const second = "01JMMMMMMMMMMMMMMMMMMMMMM2";
    const keyOf = (id: string, size: number) => `${caller.userId}/post-media/${id}/${size}`;

    function confirm({ uploads, ids = [mediaId], existing = [], recorded }: {
        uploads: Record<string, Uint8Array | null>;
        ids?: string[];
        existing?: UploadedPostMedia[];
        recorded?: string[];
    }) {
        const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        const createMedia = mock(async ({ media }: { userId: string; media: { id: string }[] }) => recorded ?? media.map((item) => item.id));
        const result = confirmPostMediaUploadsMutation({
            input: { media: ids.map((id) => ({ mediaId: id, placeholder: "YJqGPQw7sFlslqhFafSE+Q6oJ1h2iHB2Rw" })) },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostMediaByIds: async () => existing,
                readUpload: async ({ key }: { key: string }) => uploads[key] ?? null,
                putMedia,
                deleteMedia,
                deleteUploads,
                newToken: () => "token",
                createMedia,
            },
        });
        return { result, putMedia, deleteMedia, deleteUploads, createMedia };
    }

    const landscape = (id = mediaId) => ({ [keyOf(id, 320)]: mockJpeg(320, 240), [keyOf(id, 640)]: mockJpeg(640, 480), [keyOf(id, 1280)]: mockJpeg(1280, 960) });

    it("publishes every size of every photo without metadata, records them and clears the uploads", async () => {
        const { result, putMedia, deleteUploads, createMedia } = confirm({ uploads: { ...landscape(), ...landscape(second) }, ids: [mediaId, second] });
        expect(await result).toMatchObject({ ok: true, value: { media: [{ id: mediaId, width: 1280, height: 960 }, { id: second }] } });
        expect(putMedia.mock.calls.map(([args]) => args.key)).toEqual(
            [mediaId, second].flatMap((id) => [320, 640, 1280].map((size) => `media/${id}/token-${size}`)),
        );
        for (const [args] of putMedia.mock.calls) {
            expect(new TextDecoder().decode(args.bytes)).not.toContain("GPS");
        }
        expect(createMedia).toHaveBeenCalledWith({
            userId: caller.userId,
            media: [mediaId, second].map((id) => ({ id, path: `media/${id}/token`, width: 1280, height: 960, placeholder: "YJqGPQw7sFlslqhFafSE+Q6oJ1h2iHB2Rw" })),
        });
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [mediaId, second].flatMap((id) => [320, 640, 1280].map((size) => keyOf(id, size))) });
    });

    it("takes portrait photos by their longer side", async () => {
        const { result } = confirm({ uploads: { [keyOf(mediaId, 320)]: mockJpeg(240, 320), [keyOf(mediaId, 640)]: mockJpeg(480, 640), [keyOf(mediaId, 1280)]: mockJpeg(960, 1280) } });
        expect(await result).toMatchObject({ ok: true, value: { media: [{ width: 960, height: 1280 }] } });
    });

    it("refuses them all if one is missing, mis-sized, mismatched, too thin or not an image, publishing nothing", async () => {
        for (const bad of [
            { [keyOf(second, 640)]: null },
            { [keyOf(second, 640)]: mockJpeg(600, 450) },
            { [keyOf(second, 320)]: mockJpeg(320, 320) },
            { [keyOf(second, 320)]: mockJpeg(320, 80), [keyOf(second, 640)]: mockJpeg(640, 160), [keyOf(second, 1280)]: mockJpeg(1280, 320) },
            { [keyOf(second, 1280)]: new Uint8Array([60, 104, 116, 109, 108, 62]) },
        ]) {
            const { result, putMedia, deleteUploads, createMedia } = confirm({ uploads: { ...landscape(), ...landscape(second), ...bad }, ids: [mediaId, second] });
            expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
            expect(putMedia).not.toHaveBeenCalled();
            expect(createMedia).not.toHaveBeenCalled();
            expect(deleteUploads).toHaveBeenCalledTimes(1);
        }
    });

    it("returns photos already confirmed as they are (a retry), publishing only the rest", async () => {
        const { result, putMedia } = confirm({ uploads: landscape(second), ids: [mediaId, second], existing: [uploaded()] });
        expect(await result).toMatchObject({ ok: true, value: { media: [{ id: mediaId, path: `post-media/${mediaId}/token` }, { id: second }] } });
        expect(putMedia.mock.calls.map(([args]) => args.key)).toEqual([320, 640, 1280].map((size) => `media/${second}/token-${size}`));
    });

    it("fails with a conflict when an id is someone else's photo", async () => {
        const { result, putMedia } = confirm({ uploads: landscape(), existing: [uploaded({ createdBy: userId2 })] });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(putMedia).not.toHaveBeenCalled();
    });

    it("takes published files down again if an id was taken meanwhile", async () => {
        const { result, deleteMedia } = confirm({ uploads: landscape(), recorded: [] });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => `media/${mediaId}/token-${size}`) });
    });
});

describe("photos on posts", () => {
    const post = mockPost();

    function create({ content = "", media, found }: { content?: string; media: { id: string; caption: string | null }[]; found: UploadedPostMedia[] }) {
        const createPost = mock(async () => post);
        const result = createPostMutation({
            input: { id: post.id, content, media },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                isPostingEnabled: () => true,
                getPostById: async () => null,
                getPostMediaByIds: async ({ ids }) => found.filter((media) => ids.includes(media.id)),
                createPost,
            },
        });
        return { result, createPost };
    }

    it("creates a photo-only post, with the photos in order and blank captions as none", async () => {
        const second = uploaded({ id: "01JMMMMMMMMMMMMMMMMMMMMMM2" });
        const { result, createPost } = create({
            media: [{ id: second.id, caption: "  " }, { id: mediaId, caption: " The view " }],
            found: [uploaded(), second],
        });
        expect(await result).toMatchObject({ ok: true });
        expect(createPost).toHaveBeenCalledWith({
            id: post.id,
            content: "",
            userId: caller.userId,
            media: [
                { id: second.id, caption: null, position: 0 },
                { id: mediaId, caption: "The view", position: 1 },
            ],
        });
    });

    it("refuses a post with neither text nor photos", async () => {
        const { result, createPost } = create({ content: "  ", media: [], found: [] });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(createPost).not.toHaveBeenCalled();
    });

    it("refuses photos that aren't the caller's, are on another post, are repeated or weren't uploaded", async () => {
        for (const [found, media, type] of [
            [[uploaded({ createdBy: userId2 })], [{ id: mediaId, caption: null }], "authorization"],
            [[uploaded({ postId: "01JBBBBBBBBBBBBBBBBBBBBBB9" })], [{ id: mediaId, caption: null }], "authorization"],
            [[uploaded()], [{ id: mediaId, caption: null }, { id: mediaId, caption: null }], "validation"],
            [[], [{ id: mediaId, caption: null }], "validation"],
        ] as const) {
            const { result, createPost } = create({ media: [...media], found: [...found] });
            expect(await result).toMatchObject({ ok: false, error: { type } });
            expect(createPost).not.toHaveBeenCalled();
        }
    });

    it("keeps, adds and removes photos on an edit, deleting the removed ones' files", async () => {
        const kept = { ...uploaded({ id: "01JMMMMMMMMMMMMMMMMMMMMMM3", path: "post-media/kept/t" }), postId: post.id };
        const removed = { ...uploaded({ id: "01JMMMMMMMMMMMMMMMMMMMMMM4", path: "post-media/gone/t" }), postId: post.id };
        const existing = mockPost({ media: [kept, removed].map(({ postId: _, createdBy: __, ...media }) => ({ ...media, caption: null })) });
        const updatePost = mock(async () => existing);
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await updatePostMutation({
            input: { id: post.id, content: "Edited", media: [{ id: mediaId, caption: null }, { id: kept.id, caption: "Kept" }] },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostById: async () => existing,
                getPostMediaByIds: async () => [uploaded(), kept],
                deleteMedia,
                updatePost,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(updatePost).toHaveBeenCalledWith({
            id: post.id,
            content: "Edited",
            userId: caller.userId,
            media: [{ id: mediaId, caption: null, position: 0 }, { id: kept.id, caption: "Kept", position: 1 }],
            removedMediaIds: [removed.id],
        });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => `post-media/gone/t-${size}`) });
    });

    it("deletes a deleted post's photo files", async () => {
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const { postId: _, createdBy: __, ...media } = uploaded();
        const result = await deletePostMutation({
            input: { id: post.id },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostById: async () => mockPost({ media: [{ ...media, caption: null }] }),
                deletePost: async () => true,
                deleteMedia,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => `${media.path}-${size}`) });
    });
});
