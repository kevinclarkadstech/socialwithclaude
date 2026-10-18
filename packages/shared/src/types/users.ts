import { z } from "zod";

/** Usernames: 3–30 letters, numbers and underscores (unique, case-insensitive). */
export const USERNAME_PATTERN = "^[a-zA-Z0-9_]+$";

export const username = z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(new RegExp(USERNAME_PATTERN), "Only letters, numbers and underscores");

/** Onboarding: the profile details collected after a user's first sign-in. */
export const signUpInput = z.object({
    username,
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    bio: z.string().trim().max(500).optional(),
});

export type SignUpInput = z.infer<typeof signUpInput>;
