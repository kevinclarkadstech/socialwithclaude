import type { PostCommentPhoto } from "@myapp/shared/domains";

import type { PostCommentPhotoRow } from "../../types";

export function toPostCommentPhoto(row: PostCommentPhotoRow): PostCommentPhoto {
    return {
        id: row.id,
        postCommentId: row.postCommentId,
        width: row.width,
        height: row.height,
        placeholder: row.placeholder,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
