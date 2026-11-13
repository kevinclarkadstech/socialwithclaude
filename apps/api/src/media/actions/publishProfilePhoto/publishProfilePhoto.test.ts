import { describe, expect, it, mock } from "bun:test";
import { mockJpeg } from "../../testing";
import { publishProfilePhoto } from "./publishProfilePhoto";

const userId = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const uploadId = "01JZZZZZZZZZZZZZZZZZZZZZZ1";
const uploadKeys = [`${userId}/${uploadId}/cover-800`, `${userId}/${uploadId}/cover-1600`];

function publish(uploads: Record<number, Uint8Array | null>) {
    const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
    const deleteUploads = mock(async (_args: { keys: string[] }) => {});
    const readUpload = async ({ key }: { key: string }) => uploads[Number(key.split("-").at(-1))] ?? null;
    const result = publishProfilePhoto({ storage: { readUpload, putMedia, deleteUploads }, userId, kind: "cover", uploadId });
    return { result, putMedia, deleteUploads };
}

describe("publishProfilePhoto", () => {
    it("publishes each width at the user's key without its metadata, and clears the uploads", async () => {
        const { result, putMedia, deleteUploads } = publish({ 800: mockJpeg(800, 267), 1600: mockJpeg(1600, 533) });
        expect(await result).toEqual({ status: "published" });
        const published = putMedia.mock.calls.map(([args]) => args);
        expect(published.map((media) => media.key)).toEqual([`users/${userId}/cover-800`, `users/${userId}/cover-1600`]);
        expect(published.every((media) => media.contentType === "image/jpeg")).toBe(true);
        expect(published.some((media) => String.fromCharCode(...media.bytes).includes("GPS"))).toBe(false);
        expect(deleteUploads).toHaveBeenCalledWith({ keys: uploadKeys });
    });

    it("publishes nothing for a missing width, a wrong size or something that isn't a photo, and clears the uploads", async () => {
        for (const [uploads, status] of [
            [{ 800: mockJpeg(800, 267), 1600: null }, "missing"],
            [{ 800: mockJpeg(800, 800), 1600: mockJpeg(1600, 533) }, "unusable"],
            [{ 800: new Uint8Array([60, 104, 116, 109, 108, 62]), 1600: mockJpeg(1600, 533) }, "unusable"],
        ] as const) {
            const { result, putMedia, deleteUploads } = publish(uploads);
            expect(await result).toMatchObject({ status });
            expect(putMedia).not.toHaveBeenCalled();
            expect(deleteUploads).toHaveBeenCalledWith({ keys: uploadKeys });
        }
    });
});
