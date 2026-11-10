import { validationError } from "../../../error-handling";
import type { Result } from "../../../types/result";
import { fail, succeed } from "../../../utils/result";
import type { PostMedia } from "../types/post-media";

/** Whether a post has something in it: text, or at least one photo. */
export function hasPostContent({ content, media }: { content: string; media: unknown[] }): boolean {
    return content.trim().length > 0 || media.length > 0;
}

/**
 * Whether a post's text and photos can be saved, as sent: it has text or a
 * photo, and no photo twice. (How many photos is limited by the input schema.)
 */
export function validatePostMedia({ content, media }: { content: string; media: Pick<PostMedia, "id">[] }): Result<null> {
    if (!hasPostContent({ content, media })) {
        return fail(validationError("Write something or add a photo"));
    }
    if (new Set(media.map((item) => item.id)).size !== media.length) {
        return fail(validationError("The same photo is in there twice"));
    }
    return succeed();
}
