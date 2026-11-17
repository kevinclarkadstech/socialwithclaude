import type { AppLogger } from "@myapp/shared/observability";
import type { Storage } from "../../../storage";
import { publishPostPhoto } from "../publishPostPhoto/publishPostPhoto";

/**
 * Publishes the photo the app uploaded for a comment, as it's saved: the
 * same checks and sizes as a post's photos, under the comment's folder
 * (`{commenter}/{postCommentId}/…`). Null (logged) if it isn't usable.
 */
export function publishPostCommentPhoto({ storage, logger, userId, postCommentId, photoId }: {
    storage: Pick<Storage, "readUpload" | "putMedia">;
    logger: AppLogger;
    userId: string;
    postCommentId: string;
    photoId: string;
}): Promise<{ id: string; width: number; height: number } | null> {
    // The files' folder is the comment's; publishPostPhoto names it postId.
    return publishPostPhoto({ storage, logger, userId, postId: postCommentId, photoId });
}
