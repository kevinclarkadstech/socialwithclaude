import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockProfile } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import type { PublishProfilePhotoResult } from "../../types/profile-photo";
import { confirmProfilePhotoUploadMutation } from "./confirmProfilePhotoUploadMutation";

const caller = mockCaller();
const uploadId = "01JZZZZZZZZZZZZZZZZZZZZZZ1";

function confirm(published: PublishProfilePhotoResult, as: ReturnType<typeof mockCaller> | null = caller) {
    const publishProfilePhoto = mock(async () => published);
    const touchUserProfile = mock(async () => mockProfile({ updatedAt: "2026-02-01T00:00:00.000Z" }));
    const result = confirmProfilePhotoUploadMutation({
        input: { kind: "cover", uploadId },
        context: testContext,
        dependencies: { getCallingUser: async () => as, publishProfilePhoto, touchUserProfile },
    });
    return { result, publishProfilePhoto, touchUserProfile };
}

describe("confirmProfilePhotoUploadMutation", () => {
    it("publishes the caller's upload and bumps the profile", async () => {
        const { result, publishProfilePhoto, touchUserProfile } = confirm({ status: "published" });
        expect(await result).toMatchObject({ ok: true, value: { updatedAt: "2026-02-01T00:00:00.000Z" } });
        expect(publishProfilePhoto).toHaveBeenCalledWith({ userId: caller.userId, kind: "cover", uploadId });
        expect(touchUserProfile).toHaveBeenCalledWith({ userId: caller.userId });
    });

    it("refuses an upload that didn't finish or can't be used, leaving the profile as it was", async () => {
        for (const [published, message] of [
            [{ status: "missing", detail: "cover-1600" }, "The upload didn't finish. Try again."],
            [{ status: "unusable", detail: "width 800 is 800x800" }, "That photo couldn't be used. Try a different one."],
        ] as const) {
            const { result, touchUserProfile } = confirm(published);
            expect(await result).toMatchObject({ ok: false, error: { type: "validation", message } });
            expect(touchUserProfile).not.toHaveBeenCalled();
        }
    });

    it("needs a signed-in user, and publishes nothing for a signed-out one", async () => {
        const { result, publishProfilePhoto } = confirm({ status: "published" }, null);
        expect(await result).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(publishProfilePhoto).not.toHaveBeenCalled();
    });
});
