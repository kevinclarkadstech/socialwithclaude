import z from "zod";
import { UserProfileSchema } from "./user-profile";
import { UserBlockListSchema } from "./user-block-list";

/** The signed-in user a query or mutation runs for. */
export const CallingUserSchema = z.object({
    userId: z.ulid(),
    email: z.string(),
    // The session the request came from.
    sessionId: z.string(),
    // Null until sign-up is complete.
    profile: UserProfileSchema.nullable(),
    blockList: UserBlockListSchema,
});

export type CallingUser = z.infer<typeof CallingUserSchema>;

/** A calling user who has finished sign-up. */
export type CallingUserWithProfile = CallingUser & { profile: NonNullable<CallingUser["profile"]> };

/** The dependency queries and mutations use to find out who's calling: null when signed out. */
export type GetCallingUser = () => Promise<CallingUser | null>;
