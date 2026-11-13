import { describe, expect, it, mock } from "bun:test";
import { mockJpeg, silentLogger } from "../../testing";
import { publishPostPhotos } from "./publishPostPhotos";

const userId = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const postId = "01JBBBBBBBBBBBBBBBBBBBBBB1";
const mediaId = "01JMMMMMMMMMMMMMMMMMMMMMM1";
const secondMediaId = "01JMMMMMMMMMMMMMMMMMMMMMM2";
const postPhotoKey = (id: string, size: number) => `${userId}/${postId}/${id}-${size}`;

describe("publishPostPhotos", () => {
    function publish(uploads: Record<string, Uint8Array | null>, ids = [mediaId]) {
        const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        const result = publishPostPhotos({
            storage: { readUpload: async ({ key: uploadKey }) => uploads[uploadKey] ?? null, putMedia, deleteUploads },
            logger: silentLogger,
            userId,
            postId,
            media: ids.map((id) => ({ id })),
        });
        return { result, putMedia, deleteUploads };
    }
    const landscape = (id: string) => ({ [postPhotoKey(id, 320)]: mockJpeg(320, 240), [postPhotoKey(id, 640)]: mockJpeg(640, 480), [postPhotoKey(id, 1280)]: mockJpeg(1280, 960) });

    it("publishes every size at the same key without metadata, and clears the uploads", async () => {
        const { result, putMedia, deleteUploads } = publish(landscape(mediaId));
        expect(await result).toEqual([{ id: mediaId, width: 1280, height: 960 }]);
        expect(putMedia.mock.calls.map(([args]) => args.key)).toEqual([320, 640, 1280].map((size) => postPhotoKey(mediaId, size)));
        for (const [args] of putMedia.mock.calls) {
            expect(new TextDecoder().decode(args.bytes)).not.toContain("GPS");
        }
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [320, 640, 1280].map((size) => postPhotoKey(mediaId, size)) });
    });

    it("takes portrait photos by their longer side", async () => {
        const { result } = publish({ [postPhotoKey(mediaId, 320)]: mockJpeg(240, 320), [postPhotoKey(mediaId, 640)]: mockJpeg(480, 640), [postPhotoKey(mediaId, 1280)]: mockJpeg(960, 1280) });
        expect(await result).toEqual([{ id: mediaId, width: 960, height: 1280 }]);
    });

    it("leaves out a photo that's missing, mis-sized, mismatched, too thin or not a photo, publishing the rest", async () => {
        for (const bad of [
            { [postPhotoKey(secondMediaId, 640)]: null },
            { [postPhotoKey(secondMediaId, 640)]: mockJpeg(600, 450) },
            { [postPhotoKey(secondMediaId, 320)]: mockJpeg(320, 320) },
            { [postPhotoKey(secondMediaId, 320)]: mockJpeg(320, 80), [postPhotoKey(secondMediaId, 640)]: mockJpeg(640, 160), [postPhotoKey(secondMediaId, 1280)]: mockJpeg(1280, 320) },
            { [postPhotoKey(secondMediaId, 1280)]: new Uint8Array([60, 104, 116, 109, 108, 62]) },
        ]) {
            const { result, putMedia, deleteUploads } = publish({ ...landscape(mediaId), ...landscape(secondMediaId), ...bad }, [mediaId, secondMediaId]);
            expect(await result).toEqual([{ id: mediaId, width: 1280, height: 960 }]);
            expect(putMedia.mock.calls.every(([args]) => args.key.includes(mediaId))).toBe(true);
            expect(deleteUploads.mock.calls[0]![0].keys).toHaveLength(6);
        }
    });
});
