import { sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/** The id of the user with `email` (any case), or null if there's none. */
export async function getUserIdByEmail({ email }: { email: string }): Promise<string | null> {
    const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`);
    return row?.id ?? null;
}
