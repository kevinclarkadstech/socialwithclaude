import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { schema } from "../../../db";

/**
 * True while the user in `userId` is banned (a ban that has ended doesn't
 * count). See isNotBanned for where it hides them.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function isBanned(userId: AnyPgColumn | SQL): SQL<boolean> {
    const u = schema.users;
    return sql<boolean>`exists (select 1 from ${u} where ${u.id} = ${userId} and ${u.banned} and (${u.banExpires} is null or ${u.banExpires} > now()))`;
}
