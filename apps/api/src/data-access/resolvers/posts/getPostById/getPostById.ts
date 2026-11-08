import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { postVisibleTo } from "../../../selects/postVisibility";
import { selectPosts } from "../../../selects/selectPosts";

/** A post (or listing), as `viewerId` sees it. Null if it doesn't exist or was deleted. */
export async function getPostById({ id, viewerId }: { id: string; viewerId: string | null }): Promise<Post | null> {
    const [row] = await selectPosts(db, viewerId).where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt), postVisibleTo(viewerId)));
    return row ? toPost(row) : null;
}
