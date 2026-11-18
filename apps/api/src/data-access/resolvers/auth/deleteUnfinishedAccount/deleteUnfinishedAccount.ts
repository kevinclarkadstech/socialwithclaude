import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Deletes a user who never finished sign-up (has no profile), with their
 * sessions and sign-in methods. Does nothing to anyone with a profile.
 */
export async function deleteUnfinishedAccount({ userId }: { userId: string }): Promise<void> {
    await db.delete(schema.users).where(and(
        eq(schema.users.id, userId),
        sql`not exists (select 1 from ${schema.userProfiles} p where p.user_id = ${schema.users.id})`,
    ));
}
