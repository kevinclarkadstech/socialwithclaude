import { photoKeys } from "../../../../media/utils";
import { postPhotoSizes } from "../../constants";
import type { PostCommentPhoto } from "../../types/post-comment-photo";

/** Every published file of a comment's photo (one per postPhotoSizes), for deleting them. */
export function postCommentPhotoKeys(photo: Pick<PostCommentPhoto, "id" | "createdBy" | "postCommentId">): string[] {
    return photoKeys({ userId: photo.createdBy, parentId: photo.postCommentId, photoId: photo.id, sizes: postPhotoSizes });
}
