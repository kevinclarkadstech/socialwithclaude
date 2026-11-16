import { defineRelations } from "drizzle-orm";
import { accounts, sessions, users } from "./schema";

/**
 * Relations for drizzle's relational queries. Only better-auth uses them:
 * with `joins` on, it loads a session and its user in one query. Our own
 * resolvers write their joins in SQL.
 */
export const relations = defineRelations({ users, sessions, accounts }, (r) => ({
    users: {
        sessions: r.many.sessions({ from: r.users.id, to: r.sessions.userId }),
        accounts: r.many.accounts({ from: r.users.id, to: r.accounts.userId }),
    },
    sessions: {
        user: r.one.users({ from: r.sessions.userId, to: r.users.id }),
    },
    accounts: {
        user: r.one.users({ from: r.accounts.userId, to: r.users.id }),
    },
}));
