import type { PostMedia } from "@myapp/shared/domains";

import type { PostMediaRow } from "../../types";

export function toPostMedia(row: PostMediaRow): PostMedia {
    return {
        id: row.id,
        postId: row.postId,
        caption: row.caption,
        width: row.width,
        height: row.height,
        placeholder: row.placeholder,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
