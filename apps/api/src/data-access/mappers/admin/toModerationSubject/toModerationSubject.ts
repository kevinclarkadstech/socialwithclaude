import type { ModerationSubject, UserRole } from "@myapp/shared/domains";

/** A user as moderation shows them. A ban that has ended counts as none. */
export function toModerationSubject(row: {
    userId: string;
    username: string | null;
    role: UserRole;
    banned: boolean;
    banExpires: Date | null;
    history: ModerationSubject["history"];
}): ModerationSubject {
    const isBanned = row.banned && (row.banExpires === null || row.banExpires.getTime() > Date.now());
    return {
        userId: row.userId,
        username: row.username,
        isDeleted: false,
        role: row.role,
        isBanned,
        banExpires: isBanned && row.banExpires ? row.banExpires.toISOString() : null,
        history: row.history,
    };
}

/** Someone whose account was deleted, as moderation shows them: only their id and what was done about them. */
export function toDeletedModerationSubject(row: { userId: string; history: ModerationSubject["history"] }): ModerationSubject {
    return { userId: row.userId, username: null, isDeleted: true, role: "user", isBanned: false, banExpires: null, history: row.history };
}
