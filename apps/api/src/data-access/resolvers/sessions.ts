import { and, desc, eq, gt } from "drizzle-orm";

import { schema, type Database } from "../db";

const isUsersActiveSession = (userId: string) =>
    and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date()));

/**
 * A user's signed-in sessions (one per device or browser) that haven't
 * expired, most recently active first. Read straight from the table, so
 * better-auth's "fresh session" rule for listing sessions doesn't apply.
 * Tokens are left out on purpose: they'd let whoever reads them use the
 * session.
 */
export async function getActiveSessions(db: Database, userId: string) {
    return db
        .select({
            id: schema.sessions.id,
            userAgent: schema.sessions.userAgent,
            createdAt: schema.sessions.createdAt,
            // better-auth refreshes this when it extends the session (about
            // daily while it's used), so it's a rough "last active".
            updatedAt: schema.sessions.updatedAt,
            expiresAt: schema.sessions.expiresAt,
        })
        .from(schema.sessions)
        .where(isUsersActiveSession(userId))
        .orderBy(desc(schema.sessions.updatedAt), desc(schema.sessions.id));
}

/**
 * The token of one of the user's active sessions, for revoking it through
 * better-auth; null if it isn't theirs, doesn't exist or has expired.
 */
export async function getActiveSessionToken(db: Database, userId: string, sessionId: string) {
    const [session] = await db
        .select({ token: schema.sessions.token })
        .from(schema.sessions)
        .where(and(eq(schema.sessions.id, sessionId), isUsersActiveSession(userId)));
    return session?.token ?? null;
}
