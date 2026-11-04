import z from "zod";

export const UserFollowStatusSchema = z.enum(["pending", "accepted", "denied"]);

/**
 * `followerId` follows (or asked to follow) `followingId`. Pending until
 * accepted or denied when the profile is followers-only.
 */
export const UserFollowSchema = z.object({
    followerId: z.ulid(),
    followingId: z.ulid(),
    status: UserFollowStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type UserFollowStatus = z.infer<typeof UserFollowStatusSchema>;
export type UserFollow = z.infer<typeof UserFollowSchema>;
