import { and, inArray, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { readPosts } from "../readPosts/readPosts";

/** The posts with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getPostsByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<Post[]> {
    if (ids.length === 0) {
        return [];
    }
    return readPosts({ viewerId, where: and(inArray(schema.posts.id, ids), isNull(schema.posts.deletedAt)) });
}
