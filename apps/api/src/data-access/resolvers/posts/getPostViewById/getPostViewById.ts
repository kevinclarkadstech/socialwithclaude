import { and, eq, isNull } from "drizzle-orm";
import type { PostView } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { findPostViews } from "../findPostViews/findPostViews";

/** A post (or listing), as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getPostViewById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<PostView | null> {
    const [post] = await findPostViews({ executor, viewerId, where: and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)) });
    return post ?? null;
}
