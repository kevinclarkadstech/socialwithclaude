import { z } from "zod";

import { MEDIA_MAX_PER_POST } from "../media";

/**
 * A post's photos, in display order: keys from media.createUploadUrl, or keys
 * of photos the post already has (when editing).
 */
export const mediaInput = z
    .array(
        z.object({
            key: z.string().min(1).max(300),
            altText: z.string().trim().max(300).nullish().transform((v) => v || null),
            width: z.number().int().positive().max(20_000).nullish(),
            height: z.number().int().positive().max(20_000).nullish(),
        }),
    )
    .max(MEDIA_MAX_PER_POST);
