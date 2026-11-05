import { eq } from "drizzle-orm";
import type { UserFeedback } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFeedback } from "../../../mappers/users";

export async function getUserFeedbackById({ id }: { id: string }): Promise<UserFeedback | null> {
    const [row] = await db.select().from(schema.userFeedback).where(eq(schema.userFeedback.id, id));
    return row ? toUserFeedback(row) : null;
}
