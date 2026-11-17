import z from "zod";

/** What a user can do beyond the app itself: "admin" can moderate (reports, bans, feedback). */
export const UserRoleSchema = z.enum(["user", "admin"]);

export type UserRole = z.infer<typeof UserRoleSchema>;
