import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** How many posts (listings included) `userId` has, not counting deleted ones. */
export async function countUserPosts({ userId }: { userId: string }): Promise<number> {
    const [row] = await db
        .select({ value: count() })
        .from(schema.posts)
        .where(and(eq(schema.posts.createdBy, userId), isNull(schema.posts.deletedAt)));
    return row?.value ?? 0;
}
