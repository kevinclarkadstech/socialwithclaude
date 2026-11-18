import z from "zod";
import { UserProfileSchema } from "./user-profile";
import { UserBlockListSchema } from "./user-block-list";
import { UserRoleSchema } from "./user-role";

/** The signed-in user a query or mutation runs for. */
export const CallingUserSchema = z.object({
    userId: z.ulid(),
    email: z.string(),
    // The session the request came from.
    sessionId: z.string(),
    // Null until sign-up is complete.
    profile: UserProfileSchema.nullable(),
    blockList: UserBlockListSchema,
    // "admin" can moderate; everyone else is "user".
    role: UserRoleSchema,
    // When they asked to delete their account; null unless it's scheduled for deletion.
    // Until they restore it, the API treats them as signed out everywhere but the account procedures.
    deletionScheduledAt: z.iso.datetime().nullable(),
    // The version of the terms they last agreed to (see currentTermsVersion); null until they finish sign-up.
    termsAcceptedVersion: z.string().nullable(),
});

export type CallingUser = z.infer<typeof CallingUserSchema>;

/** A calling user who has finished sign-up. */
export type CallingUserWithProfile = CallingUser & { profile: NonNullable<CallingUser["profile"]> };

/** The dependency queries and mutations use to find out who's calling: null when signed out. */
export type GetCallingUser = () => Promise<CallingUser | null>;
