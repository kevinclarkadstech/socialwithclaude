import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Whether an email hash (see bannedEmailHash) belongs to someone banned when their account was deleted. */
export async function isEmailHashBanned({ emailHash }: { emailHash: string }): Promise<boolean> {
    const [row] = await db.select({ emailHash: schema.bannedEmails.emailHash }).from(schema.bannedEmails).where(eq(schema.bannedEmails.emailHash, emailHash));
    return Boolean(row);
}
