import type { UserFeedback } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFeedback } from "../../../mappers/users";

/** Stores feedback with the client's `id`. */
export async function createUserFeedback(
    feedback: Pick<UserFeedback, "id" | "userId" | "category" | "message" | "pageUrl" | "userAgent">,
): Promise<UserFeedback> {
    const [row] = await db.insert(schema.userFeedback).values(feedback).returning();
    return toUserFeedback(row!);
}
