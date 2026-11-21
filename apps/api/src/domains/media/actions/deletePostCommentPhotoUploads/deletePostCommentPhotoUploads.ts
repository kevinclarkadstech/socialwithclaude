import type { Storage } from "../../../../infra/storage";
import { deletePostPhotoUploads } from "../deletePostPhotoUploads/deletePostPhotoUploads";

/** Deletes the uploads of a comment's photo (every size), once the comment is saved. */
export function deletePostCommentPhotoUploads({ storage, userId, postCommentId, photoIds }: {
    storage: Pick<Storage, "deleteUploads">;
    userId: string;
    postCommentId: string;
    photoIds: string[];
}): Promise<void> {
    // Same keys as a post's photo uploads, under the comment's folder.
    return deletePostPhotoUploads({ storage, userId, postId: postCommentId, photoIds });
}
