import z from "zod";

export const UserProfileSchema = z.object({
    userId: z.ulid(),
    // Unique, case-insensitive.
    username: z
        .string()
        .min(3, "At least 3 characters")
        .max(30, "At most 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
    firstName: z.string().trim().max(50).nullable(),
    lastName: z.string().trim().max(50).nullable(),
    about: z.string().max(20000).nullable(),
    numFollowers: z.int().min(0),
    numFollowing: z.int().min(0),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
