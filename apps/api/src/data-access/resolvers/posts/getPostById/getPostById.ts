import { and, eq, isNull } from "drizzle-orm";
import type { Post } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { readPosts } from "../readPosts/readPosts";

/** A post (or listing), as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getPostById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<Post | null> {
    const [post] = await readPosts({ executor, viewerId, where: and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)) });
    return post ?? null;
}
