import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { mockJpeg } from "../../../testing/images";
import type { UploadedPostMedia } from "../types/post-media";
import { confirmPostMediaUploadMutation } from "./confirmPostMediaUploadMutation";
import { createPostMediaUploadMutation } from "./createPostMediaUploadMutation";
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
        caption: null,
        postId: null,
        createdBy: caller.userId,
        ...overrides,
    };
}

describe("createPostMediaUploadMutation", () => {
    const create = (sizes: number[]) => createPostMediaUploadMutation({
        input: { mediaId, files: sizes.map((size) => ({ size, contentType: "image/webp", contentLength: 1000 })) },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            createUploadUrl: async ({ key }) => `https://storage.test/${key}?signed`,
        },
    });

    it("hands out an upload URL per size, under the caller's id", async () => {
        const result = await create([320, 640, 1280]);
        expect(result).toMatchObject({ ok: true });
        expect(result.ok && result.value.uploads.map((upload) => upload.url)).toEqual(
            [320, 640, 1280].map((size) => `https://storage.test/${uploadKey(size)}?signed`),
        );
    });

    it("refuses anything but one file at each size", async () => {
        expect(await create([320, 1280])).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await create([320, 640, 640, 1280])).toMatchObject({ ok: false, error: { type: "validation" } });
    });
});

describe("confirmPostMediaUploadMutation", () => {
    function confirm({ uploads, existing = null, created = uploaded() }: {
        uploads: Record<number, Uint8Array | null>;
        existing?: UploadedPostMedia | null;
        created?: UploadedPostMedia | null;
    }) {
        const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        const createPostMedia = mock(async (_args: object) => created);
        const result = confirmPostMediaUploadMutation({
            input: { mediaId, placeholder: "YJqGPQw7sFlslqhFafSE+Q6oJ1h2iHB2Rw" },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostMediaById: async () => existing,
                readUpload: async ({ key }) => uploads[Number(key.split("/").at(-1))] ?? null,
                putMedia,
                deleteMedia,
                deleteUploads,
                newToken: () => "token",
                createPostMedia,
            },
        });
        return { result, putMedia, deleteMedia, deleteUploads, createPostMedia };
    }

    const landscape = { 320: mockJpeg(320, 240), 640: mockJpeg(640, 480), 1280: mockJpeg(1280, 960) };

    it("publishes every size without metadata, records the photo and clears the uploads", async () => {
        const { result, putMedia, deleteUploads, createPostMedia } = confirm({ uploads: landscape });
        expect(await result).toMatchObject({ ok: true, value: { id: mediaId, width: 1280, height: 960 } });
        expect(putMedia.mock.calls.map(([args]) => args.key)).toEqual(
            [320, 640, 1280].map((size) => `post-media/${mediaId}/token-${size}`),
        );
        for (const [args] of putMedia.mock.calls) {
            expect(new TextDecoder().decode(args.bytes)).not.toContain("GPS");
        }
        expect(createPostMedia).toHaveBeenCalledWith({
            id: mediaId,
            userId: caller.userId,
            path: `post-media/${mediaId}/token`,
            width: 1280,
            height: 960,
            placeholder: "YJqGPQw7sFlslqhFafSE+Q6oJ1h2iHB2Rw",
        });
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [320, 640, 1280].map(uploadKey) });
    });

    it("takes portrait photos by their longer side", async () => {
        const { result } = confirm({
            uploads: { 320: mockJpeg(240, 320), 640: mockJpeg(480, 640), 1280: mockJpeg(960, 1280) },
            created: uploaded({ width: 960, height: 1280 }),
        });
        expect(await result).toMatchObject({ ok: true, value: { width: 960, height: 1280 } });
    });

    it("refuses missing, mis-sized, mismatched or too-thin uploads, publishing nothing and clearing them", async () => {
        for (const uploads of [
            { ...landscape, 640: null },
            { ...landscape, 640: mockJpeg(600, 450) },
            { ...landscape, 320: mockJpeg(320, 320) },
            { 320: mockJpeg(320, 80), 640: mockJpeg(640, 160), 1280: mockJpeg(1280, 320) },
            { ...landscape, 1280: new Uint8Array([60, 104, 116, 109, 108, 62]) },
        ]) {
            const { result, putMedia, deleteUploads, createPostMedia } = confirm({ uploads });
            expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
            expect(putMedia).not.toHaveBeenCalled();
            expect(createPostMedia).not.toHaveBeenCalled();
            expect(deleteUploads).toHaveBeenCalledWith({ keys: [320, 640, 1280].map(uploadKey) });
        }
    });

    it("returns the photo when a confirm is retried, without publishing again, and clears any new uploads", async () => {
        const { result, putMedia, deleteUploads } = confirm({ uploads: {}, existing: uploaded() });
        expect(await result).toMatchObject({ ok: true, value: { id: mediaId } });
        expect(putMedia).not.toHaveBeenCalled();
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [320, 640, 1280].map(uploadKey) });
    });

    it("fails with a conflict when the id is someone else's photo", async () => {
        const { result, putMedia } = confirm({ uploads: landscape, existing: uploaded({ createdBy: userId2 }) });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(putMedia).not.toHaveBeenCalled();
    });

    it("takes the published files down again if the id was taken meanwhile", async () => {
        const { result, deleteMedia } = confirm({ uploads: landscape, created: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => `post-media/${mediaId}/token-${size}`) });
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
        const existing = mockPost({ media: [kept, removed].map(({ postId: _, createdBy: __, ...media }) => media) });
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
                getPostById: async () => mockPost({ media: [media] }),
                deletePost: async () => true,
                deleteMedia,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => `${media.path}-${size}`) });
    });
});
