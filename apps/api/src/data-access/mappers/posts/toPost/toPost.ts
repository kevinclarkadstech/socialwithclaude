import type { Post } from "@myapp/shared/domains";

import type { PostRow } from "../../types";

/** A post as stored (no listing details, photos, creator or viewer). */
export function toPost(row: PostRow): Post {
    return {
        id: row.id,
        type: row.type,
        content: row.content,
        numSaves: row.numSaves,
        numComments: row.numComments,
        numShares: row.numShares,
        numReactions: row.numReactions,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
