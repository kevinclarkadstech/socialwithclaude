import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { moderationHistoryDays } from "@myapp/shared/domains";
import { schema } from "../../../db";

/**
 * What admins did about the user in `userId` in the last
 * moderationHistoryDays days, as columns to select: warnings, removals of
 * their content, and bans.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function moderationHistory(userId: AnyPgColumn | SQL): { warnings: SQL<number>; removals: SQL<number>; bans: SQL<number> } {
    const a = schema.moderationActions;
    const counted = (action: string) => sql<number>`(
        select count(*)::int from ${a}
        where ${a.subjectUserId} = ${userId}
            and ${a.action} = ${action}
            and ${a.createdAt} > now() - make_interval(days => ${moderationHistoryDays})
    )`;
    return { warnings: counted("warn_user"), removals: counted("remove_content"), bans: counted("ban_user") };
}
