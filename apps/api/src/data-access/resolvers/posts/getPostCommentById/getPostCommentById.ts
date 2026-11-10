import { and, eq, isNull } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { readPostComments } from "../readPostComments/readPostComments";

/** A comment, as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getPostCommentById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<PostComment | null> {
    const [comment] = await readPostComments({ executor, viewerId, where: and(eq(schema.postComments.id, id), isNull(schema.postComments.deletedAt)) });
    return comment ?? null;
}
