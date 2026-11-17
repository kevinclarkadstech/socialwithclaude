import { sql } from "drizzle-orm";
import type { UserRole } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Sets the role of the user with `email` (any case). Their id, or null if there's no such user. */
export async function setUserRoleByEmail({ email, role }: { email: string; role: UserRole }): Promise<string | null> {
    const [row] = await db
        .update(schema.users)
        .set({ role, updatedAt: new Date() })
        .where(sql`lower(${schema.users.email}) = lower(${email})`)
        .returning({ id: schema.users.id });
    return row?.id ?? null;
}
