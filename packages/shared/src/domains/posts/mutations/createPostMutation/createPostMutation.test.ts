import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../../types/post";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { mediaId, photoFromApp, savedPhoto, secondMediaId } from "../../../../testing/postMedia";
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
            deletePostPhotoUploads: async () => {},
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
                deletePostPhotoUploads: async () => {},
                createPost,
            },
        });
        expect(result).toMatchObject({ ok: true });
        expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ listing }));
    });
});

describe("createPostMutation with photos", () => {
    const caller = mockCaller();
    const userId = caller.userId;

    function create({ content = "", media, published = media.map(({ id }) => ({ id, width: 1280, height: 960 })), save = async () => post, deleteUploads = async () => {} }: {
        content?: string;
        media: ReturnType<typeof photoFromApp>[];
        published?: { id: string; width: number; height: number }[];
        save?: () => Promise<PostView | null>;
        deleteUploads?: () => Promise<void>;
    }) {
        // What ran, in order.
        const calls: string[] = [];
        const createPost = mock(async () => {
            calls.push("createPost");
            return save();
        });
        const publishPostPhotos = mock(async () => {
            calls.push("publishPostPhotos");
            return published;
        });
        const deletePostPhotoUploads = mock(async (_args: { userId: string; postId: string; photoIds: string[] }) => {
            calls.push("deletePostPhotoUploads");
            return deleteUploads();
        });
        const result = createPostMutation({
            input: { id: post.id, content, media },
            context: testContext,
            dependencies: {
                getCallingUser: async () => caller,
                isPostingEnabled: () => true,
                getPostViewById: async () => null,
                publishPostPhotos,
                deletePostPhotoUploads,
                createPost,
            },
        });
        return { result, createPost, publishPostPhotos, deletePostPhotoUploads, calls };
    }

    it("creates a photo-only post: publishes its photos under its id, saving them with the server's post, owner, time and real sizes", async () => {
        const { result, createPost, publishPostPhotos } = create({
            media: [photoFromApp(secondMediaId, "  "), photoFromApp(mediaId, " The view ")],
            published: [{ id: mediaId, width: 960, height: 1280 }, { id: secondMediaId, width: 1280, height: 427 }],
        });
        expect(await result).toMatchObject({ ok: true });
        expect(publishPostPhotos).toHaveBeenCalledWith({ userId, postId: post.id, media: [photoFromApp(secondMediaId, "  "), photoFromApp(mediaId, " The view ")] });
        expect(createPost).toHaveBeenCalledWith({
            id: post.id,
            content: "",
            userId,
            // In the order they were added (by id), whatever order they came in.
            media: [savedPhoto(mediaId, "The view", 960, 1280), savedPhoto(secondMediaId, null, 1280, 427)],
        });
    });

    it("leaves off a photo that couldn't be published", async () => {
        const { result, createPost } = create({ content: "Hi", media: [photoFromApp(mediaId), photoFromApp(secondMediaId)], published: [{ id: secondMediaId, width: 1280, height: 960 }] });
        expect(await result).toMatchObject({ ok: true });
        expect(createPost).toHaveBeenCalledWith({
            id: post.id,
            content: "Hi",
            userId,
            media: [savedPhoto(secondMediaId, null, 1280, 960)],
        });
    });

    it("refuses a post with nothing in it, or whose only photos didn't upload", async () => {
        const empty = create({ content: "  ", media: [] });
        expect(await empty.result).toMatchObject({ ok: false, error: { type: "validation" } });
        const lost = create({ media: [photoFromApp(mediaId)], published: [] });
        expect(await lost.result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(lost.createPost).not.toHaveBeenCalled();
    });

    it("refuses the same photo twice", async () => {
        const { result, publishPostPhotos } = create({ content: "Hi", media: [photoFromApp(mediaId), photoFromApp(mediaId)] });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(publishPostPhotos).not.toHaveBeenCalled();
    });

    it("deletes every photo's uploads (left out ones too) only once the post is saved", async () => {
        const { result, deletePostPhotoUploads, calls } = create({ content: "Hi", media: [photoFromApp(mediaId), photoFromApp(secondMediaId)], published: [{ id: secondMediaId, width: 1280, height: 960 }] });
        expect(await result).toMatchObject({ ok: true });
        expect(calls).toEqual(["publishPostPhotos", "createPost", "deletePostPhotoUploads"]);
        expect(deletePostPhotoUploads).toHaveBeenCalledWith({ userId, postId: post.id, photoIds: [mediaId, secondMediaId] });
    });

    it("keeps the uploads when saving fails, so a retry can publish the photos again", async () => {
        const failed = create({ media: [photoFromApp(mediaId)], save: async () => { throw new Error("database down"); } });
        expect(failed.result).rejects.toThrow("database down");
        await failed.result.catch(() => {});
        expect(failed.deletePostPhotoUploads).not.toHaveBeenCalled();

        const retried = create({ media: [photoFromApp(mediaId)] });
        expect(await retried.result).toMatchObject({ ok: true });
        expect(retried.calls).toEqual(["publishPostPhotos", "createPost", "deletePostPhotoUploads"]);
        expect(retried.createPost).toHaveBeenCalledWith(expect.objectContaining({ media: [savedPhoto(mediaId, null, 1280, 960)] }));
    });

    it("keeps the uploads when the id turns out to be taken", async () => {
        const { result, deletePostPhotoUploads } = create({ media: [photoFromApp(mediaId)], save: async () => null });
        expect(await result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(deletePostPhotoUploads).not.toHaveBeenCalled();
    });

    it("still succeeds when deleting the uploads fails (they expire on their own)", async () => {
        const { result } = create({ media: [photoFromApp(mediaId)], deleteUploads: async () => { throw new Error("storage down"); } });
        expect(await result).toMatchObject({ ok: true, value: post });
    });
});
