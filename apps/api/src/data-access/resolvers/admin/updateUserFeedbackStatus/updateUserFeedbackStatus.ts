import { eq } from "drizzle-orm";
import type { UserFeedbackStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Sets feedback's status. False if there's no such feedback. */
export async function updateUserFeedbackStatus({ id, status }: { id: string; status: UserFeedbackStatus }): Promise<boolean> {
    const rows = await db
        .update(schema.userFeedback)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.userFeedback.id, id))
        .returning({ id: schema.userFeedback.id });
    return rows.length > 0;
}
