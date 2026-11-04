import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { requireCaller } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../../users/types/calling-user";
import { UserSessionSchema, type UserSession } from "../../users/types/user-session";

export const GetMySessionsQueryInputSchema = z.object({}).default({});

export type GetMySessionsQueryInput = z.infer<typeof GetMySessionsQueryInputSchema>;

export const GetMySessionsQueryOutputSchema = z.array(
    UserSessionSchema.omit({ token: true, userId: true }).extend({
        // The session this request came from.
        current: z.boolean(),
    }),
);

export type GetMySessionsQueryOutput = z.infer<typeof GetMySessionsQueryOutputSchema>;

/** Where the caller is signed in, most recently active first. Tokens aren't returned. */
export const getMySessionsQuery: Query<{ input: GetMySessionsQueryInput, output: GetMySessionsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserSessions: (args: { userId: string }) => Promise<UserSession[]>;
}> = async ({ dependencies }) => {
    const allowed = requireCaller(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    const sessions = await dependencies.getUserSessions({ userId: allowed.value.userId });
    return succeed(sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        current: session.id === allowed.value.sessionId,
    })));
}
