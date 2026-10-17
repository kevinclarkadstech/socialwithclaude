import { z } from "zod";

import { schema } from "../data-access";
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

/** Report a post or comment. `details` is required when `reason` is "other". */
export const reportInput = z
    .object({
        id: z.string().min(1),
        reason: z.enum(schema.reportReasons),
        details: z.string().trim().max(1000).nullish().transform((v) => v || null),
    })
    .refine((input) => input.reason !== "other" || input.details, {
        message: "Details are required when the reason is 'other'",
        path: ["details"],
    });
