import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { isUnavailable } from "../isUnavailable/isUnavailable";

/**
 * True unless the user in `userId` is unavailable right now: banned, or
 * with their account scheduled for deletion. Their profile, posts and
 * comments are left out wherever they'd show, like deleted ones; nothing is
 * deleted yet, so they're back when the ban ends or they restore their
 * account. (Their chats stay, marked unavailable: see findChatViews and
 * getChatMembers.)
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function isAvailable(userId: AnyPgColumn): SQL {
    return sql`not ${isUnavailable(userId)}`;
}
