import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { schema } from "../../../db";

/**
 * True while the user in `userId` is unavailable: banned (a ban that has
 * ended doesn't count), or with their account scheduled for deletion. See
 * isAvailable for where it hides them.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function isUnavailable(userId: AnyPgColumn | SQL): SQL<boolean> {
    const u = schema.users;
    return sql<boolean>`exists (select 1 from ${u} where ${u.id} = ${userId} and (
        (${u.banned} and (${u.banExpires} is null or ${u.banExpires} > now()))
        or ${u.deletionScheduledAt} is not null
    ))`;
}
