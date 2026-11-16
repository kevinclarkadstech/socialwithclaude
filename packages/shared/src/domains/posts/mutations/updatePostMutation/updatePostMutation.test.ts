import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../../types/post";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { mediaId, photoFromApp, photoOnPost, postPhotoKey, savedPhoto } from "../../../../testing/postMedia";
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
            getPostMediaByPostId: async () => [],
            publishPostPhotos: async () => [],
            deletePostPhotoUploads: async () => {},
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
        expect(updatePost).toHaveBeenCalledWith({ id: post.id, content: "Edited", media: [], listing: undefined, userId: mockCaller().userId });
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
                getPostMediaByPostId: async () => [],
                publishPostPhotos: async () => [],
                deletePostPhotoUploads: async () => {},
                deleteMedia: async () => {},
                updatePost: async () => null,
            },
        });
        expect(result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});

describe("updatePostMutation with listing details", () => {
    const listing = { title: "Desk lamp", description: "Warm light", condition: "used" as const, status: "sold" as const, isNegotiable: false, type: "free" as const };

    function update(existing: ReturnType<typeof mockPost>) {
        const updatePost = mock(async () => existing);
        const result = updatePostMutation({
            input: { id: existing.id, content: "Warm light", media: [], listing },
            context: testContext,
            dependencies: {
                getCallingUser: async () => mockCaller(),
                getPostById: async () => existing,
                getPostMediaByPostId: async () => [],
                publishPostPhotos: async () => [],
                deletePostPhotoUploads: async () => {},
                deleteMedia: async () => {},
                updatePost,
            },
        });
        return { result, updatePost };
    }

    it("saves a listing's details with it", async () => {
        const { result, updatePost } = update(mockPost({ type: "listing" }));
        expect(await result).toMatchObject({ ok: true });
        expect(updatePost).toHaveBeenCalledWith(expect.objectContaining({ listing }));
    });

    it("refuses listing details for a post that isn't a listing", async () => {
        const { result, updatePost } = update(mockPost({ type: "post" }));
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(updatePost).not.toHaveBeenCalled();
    });
});

describe("updatePostMutation with photos", () => {
    const caller = mockCaller();
    const userId = caller.userId;

    const kept = "01JMMMMMMMMMMMMMMMMMMMMMM3";
    const removed = "01JMMMMMMMMMMMMMMMMMMMMMM4";

    /** Edits a post with `kept` and `removed` on it: adds mediaId, keeps `kept` (captioned), takes `removed` off. */
    function edit({ save, deleteUploads = async () => {}, deleteFiles = async () => {} }: {
        save?: () => Promise<PostView | null>;
        deleteUploads?: () => Promise<void>;
        deleteFiles?: () => Promise<void>;
    } = {}) {
        const existing = mockPost({ media: [photoOnPost(kept), photoOnPost(removed)] });
        // What ran, in order.
        const calls: string[] = [];
        const updatePost = mock(async () => {
            calls.push("updatePost");
            return save ? save() : existing;
        });
        const publishPostPhotos = mock(async () => {
            calls.push("publishPostPhotos");
            return [{ id: mediaId, width: 960, height: 1280 }];
        });
        const deletePostPhotoUploads = mock(async (_args: { userId: string; postId: string; photoIds: string[] }) => {
            calls.push("deletePostPhotoUploads");
            return deleteUploads();
        });
        const deleteMedia = mock(async (_args: { keys: string[] }) => {
            calls.push("deleteMedia");
            return deleteFiles();
        });
        const result = updatePostMutation({
            input: { id: post.id, content: "Edited", media: [photoFromApp(mediaId), photoFromApp(kept, "Kept")] },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                getPostById: async () => existing,
                getPostMediaByPostId: async () => existing.media,
                publishPostPhotos,
                deletePostPhotoUploads,
                deleteMedia,
                updatePost,
            },
        });
        return { result, existing, calls, updatePost, publishPostPhotos, deletePostPhotoUploads, deleteMedia };
    }

    it("on an edit, publishes only new photos, keeps the rest (with new captions), and deletes removed ones' files", async () => {
        const { result, updatePost, publishPostPhotos, deleteMedia } = edit();
        expect(await result).toMatchObject({ ok: true });
        expect(publishPostPhotos).toHaveBeenCalledWith({ userId, postId: post.id, media: [photoFromApp(mediaId)] });
        expect(updatePost).toHaveBeenCalledWith({
            id: post.id,
            content: "Edited",
            userId,
            media: [savedPhoto(mediaId, null, 960, 1280), expect.objectContaining({ id: kept, caption: "Kept", width: 1280, height: 960, updatedBy: userId })],
        });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => postPhotoKey(removed, size)) });
    });

    it("deletes the new photos' uploads and the removed photos' files only once the post is saved", async () => {
        const { result, calls, deletePostPhotoUploads } = edit();
        expect(await result).toMatchObject({ ok: true });
        expect(calls).toEqual(["publishPostPhotos", "updatePost", "deletePostPhotoUploads", "deleteMedia"]);
        expect(deletePostPhotoUploads).toHaveBeenCalledWith({ userId, postId: post.id, photoIds: [mediaId] });
    });

    it("deletes nothing when saving fails, so a retry can publish the new photos again", async () => {
        const { result, deletePostPhotoUploads, deleteMedia } = edit({ save: async () => { throw new Error("database down"); } });
        expect(result).rejects.toThrow("database down");
        await result.catch(() => {});
        expect(deletePostPhotoUploads).not.toHaveBeenCalled();
        expect(deleteMedia).not.toHaveBeenCalled();
    });

    it("still succeeds when the clean-up fails (left-overs expire or are swept up)", async () => {
        const { result, existing } = edit({
            deleteUploads: async () => { throw new Error("storage down"); },
            deleteFiles: async () => { throw new Error("storage down"); },
        });
        expect(await result).toEqual({ ok: true, value: existing });
    });
});
