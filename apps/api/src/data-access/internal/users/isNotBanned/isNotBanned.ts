import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { isBanned } from "../isBanned/isBanned";

/**
 * True unless the user in `userId` is banned right now (a ban that has
 * ended doesn't count). A banned person's profile, posts and comments are
 * left out wherever they'd show, like deleted ones; nothing about them is
 * deleted, so they're back when the ban ends or is lifted. (Their chats
 * stay, marked unavailable: see findChatViews and getChatMembers.)
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function isNotBanned(userId: AnyPgColumn): SQL {
    return sql`not ${isBanned(userId)}`;
}
