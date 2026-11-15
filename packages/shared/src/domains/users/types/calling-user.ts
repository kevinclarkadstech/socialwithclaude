import z from "zod";
import { UserProfileSchema } from "./user-profile";
import { UserBlockListSchema, type UserBlockList } from "./user-block-list";

/**
 * The signed-in user a query or mutation runs for: only what the session
 * says, so knowing who's calling costs no lookup of its own. Their profile
 * and block list are loaded where they're needed (see SignedInUser and
 * CallingUserWithBlockList).
 */
export const CallingUserSchema = z.object({
    userId: z.ulid(),
    email: z.string(),
    // The session the request came from.
    sessionId: z.string(),
    // False until sign-up is complete.
    hasProfile: z.boolean(),
});

export type CallingUser = z.infer<typeof CallingUserSchema>;

/** A calling user who has finished sign-up. */
export type CallingUserWithProfile = CallingUser & { hasProfile: true };

/** A calling user with who they've blocked and who has blocked them: what the checks that look at blocks need. */
export type CallingUserWithBlockList = CallingUser & { blockList: UserBlockList };

/** The dependency queries and mutations use to find out who's calling: null when signed out. */
export type GetCallingUser = () => Promise<CallingUser | null>;

/** Like GetCallingUser, for queries and mutations whose checks look at blocks. */
export type GetCallingUserWithBlockList = () => Promise<CallingUserWithBlockList | null>;

/**
 * The signed-in user with their profile and block list: what the app loads
 * once (getMeQuery) and keeps, to show who's signed in and to run the same
 * checks the API does. `profile` is null until sign-up is complete.
 */
export const SignedInUserSchema = CallingUserSchema.extend({
    profile: UserProfileSchema.nullable(),
    blockList: UserBlockListSchema,
});

export type SignedInUser = z.infer<typeof SignedInUserSchema>;
