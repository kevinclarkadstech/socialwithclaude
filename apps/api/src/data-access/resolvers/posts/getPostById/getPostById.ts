import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

/** A post as stored (no creator, photos or viewer: see getPostViewById). Null if it doesn't exist or was deleted. */
export async function getPostById({ id }: { id: string }): Promise<Post | null> {
    const [row] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)));
    return row ? toPost(row) : null;
}
