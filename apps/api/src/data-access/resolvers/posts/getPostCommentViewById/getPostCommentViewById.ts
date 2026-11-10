import { and, eq, isNull } from "drizzle-orm";
import type { PostCommentView } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { findPostCommentViews } from "../../../internal/posts/findPostCommentViews/findPostCommentViews";

/** A comment, as `viewerId` sees it. Null if it doesn't exist or was deleted. Runs in `executor` (e.g. a transaction) if given. */
export async function getPostCommentViewById({ id, viewerId }: { id: string; viewerId: string | null }, executor: Executor = db): Promise<PostCommentView | null> {
    const [comment] = await findPostCommentViews({ executor, viewerId, where: and(eq(schema.postComments.id, id), isNull(schema.postComments.deletedAt)) });
    return comment ?? null;
}
