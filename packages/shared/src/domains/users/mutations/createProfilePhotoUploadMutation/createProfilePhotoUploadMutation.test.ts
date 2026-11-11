import { describe, expect, it, mock } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { createProfilePhotoUploadMutation } from "./createProfilePhotoUploadMutation";

const caller = mockCaller();
const uploadId = "01JZZZZZZZZZZZZZZZZZZZZZZ1";

describe("createProfilePhotoUploadMutation", () => {
    const run = (widths: number[]) => {
        const createUploadUrl = mock(async ({ key }: { key: string }) => `https://storage.test/${key}?signed`);
        const result = createProfilePhotoUploadMutation({
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
