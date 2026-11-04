import z from "zod";

export const UserBlockSchema = z.object({
    userId: z.ulid(),
    blockedUserId: z.ulid(),
    createdAt: z.iso.datetime(),
});

export type UserBlock = z.infer<typeof UserBlockSchema>;