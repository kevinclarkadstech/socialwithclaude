import { z } from "zod";

import { createUploadKey, MEDIA_MAX_BYTES, mediaMimeTypes } from "../../media";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

export const mediaRouter = router({
    /**
     * Presigned upload for one photo. PUT the file to `uploadUrl` with
     * `headers`, then pass `key` in a post's `media` array. Uploads that are
     * never attached to a post expire.
     */
    createUploadUrl: procedure
        .input(
            z.object({
                mimeType: z.enum(mediaMimeTypes),
                sizeBytes: z.number().int().min(1).max(MEDIA_MAX_BYTES),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            const key = createUploadKey(user.id, input.mimeType);
            const upload = await ctx.storage.createUploadUrl(key, input.mimeType, input.sizeBytes);
            return { key, uploadUrl: upload.url, headers: upload.headers };
        }),
});
