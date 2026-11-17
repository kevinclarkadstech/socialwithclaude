import { eq } from "drizzle-orm";
import type { ModerationSubject } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toModerationSubject } from "../../../mappers/admin/toModerationSubject/toModerationSubject";

/** A user as moderation sees them (role and ban). Null if there's no such user. */
export async function getModerationSubject({ userId }: { userId: string }): Promise<ModerationSubject | null> {
    const [row] = await db
        .select({
            userId: schema.users.id,
            username: schema.userProfiles.username,
            role: schema.users.role,
            banned: schema.users.banned,
            banExpires: schema.users.banExpires,
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(eq(schema.users.id, userId));
    return row ? toModerationSubject(row) : null;
}
