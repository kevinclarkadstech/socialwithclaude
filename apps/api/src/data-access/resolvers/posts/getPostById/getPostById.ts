import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

/** A post (or listing), or null if it doesn't exist or was deleted. */
export async function getPostById({ id }: { id: string }): Promise<Post | null> {
    const [row] = await db
        .select({ post: schema.posts, listing: schema.postListings })
        .from(schema.posts)
        .leftJoin(schema.postListings, eq(schema.postListings.postId, schema.posts.id))
        .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)));
    return row ? toPost(row.post, row.listing) : null;
}
