import { eq } from "drizzle-orm";

import { schema, type Database } from "../db";
import { IdConflictError } from "../errors";

/**
 * Stores feedback. `id` is client-generated (optional); retrying with the
 * same id succeeds without storing it again.
 *
 * @throws IdConflictError if `id` belongs to another user's feedback.
 */
export async function submitFeedback(
    db: Database,
    { userId, ...values }: {
        id?: string;
        userId: string;
        category: (typeof schema.feedbackCategories)[number];
        message: string;
        pageUrl: string | null;
        userAgent: string | null;
    },
) {
    const [feedback] = await db
        .insert(schema.userFeedback)
        .values({ ...values, createdBy: userId, updatedBy: userId })
        .onConflictDoNothing({ target: schema.userFeedback.id })
        .returning({ id: schema.userFeedback.id });
    if (feedback) return;

    const [existing] = await db
        .select({ userId: schema.userFeedback.createdBy })
        .from(schema.userFeedback)
        .where(eq(schema.userFeedback.id, values.id!));
    if (!existing || existing.userId !== userId) throw new IdConflictError(values.id!);
}
