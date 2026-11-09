import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockProfile } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { mockJpeg } from "../../../testing/images";
import { confirmProfileImageUploadMutation } from "./confirmProfileImageUploadMutation";
import { createProfileImageUploadMutation } from "./createProfileImageUploadMutation";
import { removeProfileImageMutation } from "./removeProfileImageMutation";

const caller = mockCaller();
const uploadId = "01JZZZZZZZZZZZZZZZZZZZZZZ1";

const jpeg = mockJpeg;

function confirm(uploads: Record<string, Uint8Array | null>) {
    const putMedia = mock(async (_args: { key: string; bytes: Uint8Array; contentType: string }) => {});
    const deleteUploads = mock(async (_args: { keys: string[] }) => {});
    const touchUserProfile = mock(async () => mockProfile({ updatedAt: "2026-02-01T00:00:00.000Z" }));
    const result = confirmProfileImageUploadMutation({
        input: { kind: "cover", uploadId },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            readUpload: async ({ key }) => uploads[key] ?? null,
            putMedia,
            deleteUploads,
            touchUserProfile,
        },
    });
    return { result, putMedia, deleteUploads, touchUserProfile };
}

const coverUploads = (sizes: Record<number, Uint8Array | null>) =>
    Object.fromEntries(Object.entries(sizes).map(([width, bytes]) => [`${caller.userId}/${uploadId}/cover-${width}`, bytes]));

describe("createProfileImageUploadMutation", () => {
    const run = (widths: number[]) => {
        const createUploadUrl = mock(async ({ key }: { key: string }) => `https://storage.test/${key}?signed`);
        const result = createProfileImageUploadMutation({
            input: { kind: "avatar", uploadId, files: widths.map((width) => ({ width, contentType: "image/webp", contentLength: 5000 })) },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, createUploadUrl },
        });
        return { result, createUploadUrl };
    };

    it("signs an upload per width, under the caller's id", async () => {
        const { result, createUploadUrl } = run([96, 400]);
        expect(await result).toMatchObject({ ok: true, value: { uploads: [{ width: 96 }, { width: 400 }] } });
        expect(createUploadUrl).toHaveBeenCalledWith({ key: `${caller.userId}/${uploadId}/avatar-96`, contentType: "image/webp", contentLength: 5000 });
    });

    it("refuses a set of widths that isn't the kind's", async () => {
        expect(await run([96]).result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await run([96, 400, 800]).result).toMatchObject({ ok: false, error: { type: "validation" } });
    });
});

describe("confirmProfileImageUploadMutation", () => {
    it("publishes each width without its metadata, removes the uploads and bumps the profile", async () => {
        const { result, putMedia, deleteUploads, touchUserProfile } = confirm(coverUploads({ 800: jpeg(800, 267), 1600: jpeg(1600, 533) }));
        expect(await result).toMatchObject({ ok: true, value: { updatedAt: "2026-02-01T00:00:00.000Z" } });
        expect(putMedia).toHaveBeenCalledTimes(2);
        const published = putMedia.mock.calls.map(([args]) => args);
        expect(published.map((media) => media.key)).toEqual([`users/${caller.userId}/cover-800`, `users/${caller.userId}/cover-1600`]);
        expect(published.every((media) => media.contentType === "image/jpeg")).toBe(true);
        expect(published.some((media) => String.fromCharCode(...media.bytes).includes("GPS"))).toBe(false);
        expect(deleteUploads).toHaveBeenCalledWith({ keys: [`${caller.userId}/${uploadId}/cover-800`, `${caller.userId}/${uploadId}/cover-1600`] });
        expect(touchUserProfile).toHaveBeenCalledWith({ userId: caller.userId });
    });

    it("refuses a missing upload, a wrong size or something that isn't an image, publishing nothing and clearing the uploads", async () => {
        for (const uploads of [
            coverUploads({ 800: jpeg(800, 267), 1600: null }),
            coverUploads({ 800: jpeg(800, 800), 1600: jpeg(1600, 533) }),
            coverUploads({ 800: new Uint8Array([60, 104, 116, 109, 108, 62]), 1600: jpeg(1600, 533) }),
        ]) {
            const { result, putMedia, deleteUploads, touchUserProfile } = confirm(uploads);
            expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
            expect(putMedia).not.toHaveBeenCalled();
            expect(deleteUploads).toHaveBeenCalledWith({ keys: [`${caller.userId}/${uploadId}/cover-800`, `${caller.userId}/${uploadId}/cover-1600`] });
            expect(touchUserProfile).not.toHaveBeenCalled();
        }
    });

    it("needs a signed-in user", async () => {
        const result = await confirmProfileImageUploadMutation({
            input: { kind: "avatar", uploadId },
            context: testContext,
            dependencies: {
                getCallingUser: async () => null,
                readUpload: async () => null,
                putMedia: async () => {},
                deleteUploads: async () => {},
                touchUserProfile: async () => mockProfile(),
            },
        });
        expect(result).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

describe("removeProfileImageMutation", () => {
    it("deletes every width and bumps the profile", async () => {
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await removeProfileImageMutation({
            input: { kind: "avatar" },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, deleteMedia, touchUserProfile: async () => mockProfile() },
        });
        expect(result.ok).toBe(true);
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [`users/${caller.userId}/avatar-96`, `users/${caller.userId}/avatar-400`] });
    });
});
