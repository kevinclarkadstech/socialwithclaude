import z from "zod";

export const UserProfileSchema = z.object({
    userId: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string().optional(),
    about: z.string().max(20000),
    numFollowers: z.int().min(0),
    numFollowing: z.int().min(0),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;