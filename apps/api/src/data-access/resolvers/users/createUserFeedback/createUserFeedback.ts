import type { UserFeedback } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFeedback } from "../../../mappers/users";

/** Stores feedback with the client's `id`. Null if the id is already used. */
export async function createUserFeedback(
    feedback: Pick<UserFeedback, "id" | "userId" | "category" | "message" | "pageUrl" | "userAgent">,
): Promise<UserFeedback | null> {
    const [row] = await db
        .insert(schema.userFeedback)
        .values(feedback)
        .onConflictDoNothing({ target: schema.userFeedback.id })
        .returning();
    return row ? toUserFeedback(row) : null;
}
