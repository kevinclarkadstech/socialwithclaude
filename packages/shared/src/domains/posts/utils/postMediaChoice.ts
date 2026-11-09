import { authorizationError, validationError } from "../../../error-handling";
import type { Result } from "../../../types/result";
import { fail, succeed } from "../../../utils/result";
import { maxPostPhotos } from "../constants";
import type { PostMedia, PostMediaChoice, PostMediaPlacement, UploadedPostMedia } from "../types/post-media";

/**
 * Whether `callerId` may give a post these photos: at most maxPostPhotos, no
 * repeats, and each one theirs and either not on a post yet or already on
 * this one (`postId`; null for a new post). `found` is what the photos' ids
 * look up to; missing ones were never uploaded (or confirmed).
 */
export function checkPostMediaChoice({ callerId, postId, chosen, found }: {
    callerId: string;
    postId: string | null;
    chosen: PostMediaChoice[];
    found: UploadedPostMedia[];
}): Result<null> {
    if (chosen.length > maxPostPhotos) {
        return fail(validationError(`A post can have up to ${maxPostPhotos} photos`));
    }
    const ids = new Set(chosen.map((media) => media.id));
    if (ids.size !== chosen.length) {
        return fail(validationError("The same photo is in there twice"));
    }
    for (const { id } of chosen) {
        const media = found.find((candidate) => candidate.id === id);
        if (!media) {
            return fail(validationError("A photo didn't finish uploading. Try adding it again."));
        }
        if (media.createdBy !== callerId) {
            return fail(authorizationError("You can only use your own photos"));
        }
        if (media.postId !== null && media.postId !== postId) {
            return fail(authorizationError("That photo is on another post"));
        }
    }
    return succeed();
}

/** Whether a post has something in it: text, or at least one photo. */
export function hasPostContent({ content, media }: { content: string; media: unknown[] }): boolean {
    return content.trim().length > 0 || media.length > 0;
}

/** Where each chosen photo goes on the post: in the order given, with empty captions as none. */
export function placePostMedia(chosen: PostMediaChoice[]): PostMediaPlacement[] {
    return chosen.map((media, position) => ({ id: media.id, caption: media.caption?.trim() || null, position }));
}

/** The photos an edit takes off a post: those it has that weren't chosen again. */
export function removedPostMedia({ current, chosen }: { current: PostMedia[]; chosen: PostMediaChoice[] }): PostMedia[] {
    return current.filter((media) => !chosen.some((choice) => choice.id === media.id));
}
