import { and, desc, eq, gt } from "drizzle-orm";
import type { UserSession } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserSession } from "../../../mappers/users/toUserSession/toUserSession";

/** Where `userId` is signed in: their unexpired sessions, most recently active first. */
export async function getUserSessions({ userId }: { userId: string }): Promise<UserSession[]> {
    const rows = await db
        .select()
        .from(schema.sessions)
        .where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date())))
        .orderBy(desc(schema.sessions.updatedAt));
    return rows.map(toUserSession);
}
