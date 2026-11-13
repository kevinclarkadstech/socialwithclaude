import z from "zod";
import { BaseEntityFieldsSchema } from "../../../types/base-entity-fields";

export const UserAccountSchema = z.object({
    accountId: z.ulid(),
    providerId: z.string(),
    userId: z.ulid(),
    accessToken: z.string().nullable(),
    refreshToken: z.string().nullable(),
    idToken: z.string().nullable(),
    accessTokenExpiresAt: z.iso.datetime().nullable(),
    refreshTokenExpiresAt: z.iso.datetime().nullable(),
    scope: z.string().nullable(),
    password: z.string().nullable(),
}).extend(BaseEntityFieldsSchema.shape);

export type UserAccount = z.infer<typeof UserAccountSchema>;