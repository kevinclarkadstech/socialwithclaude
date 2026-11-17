import type { ModerationSubject, UserRole } from "@myapp/shared/domains";

/** A user as moderation shows them. A ban that has ended counts as none. */
export function toModerationSubject(row: { userId: string; username: string | null; role: UserRole; banned: boolean; banExpires: Date | null }): ModerationSubject {
    const isBanned = row.banned && (row.banExpires === null || row.banExpires.getTime() > Date.now());
    return {
        userId: row.userId,
        username: row.username,
        role: row.role,
        isBanned,
        banExpires: isBanned && row.banExpires ? row.banExpires.toISOString() : null,
    };
}
