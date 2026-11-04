import z from "zod";

/** Who a user has blocked, and who has blocked them (user ids). */
export const UserBlockListSchema = z.object({
    blocking: z.array(z.ulid()),
    blockedBy: z.array(z.ulid()),
});

export type UserBlockList = z.infer<typeof UserBlockListSchema>;
