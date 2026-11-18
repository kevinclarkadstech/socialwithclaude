import { db, schema } from "../../../db";

/** Keeps a banned person's email hash (see bannedEmailHash), so the address can't sign up again. */
export async function addBannedEmail({ emailHash }: { emailHash: string }): Promise<void> {
    await db.insert(schema.bannedEmails).values({ emailHash }).onConflictDoNothing();
}
