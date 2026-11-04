import z from "zod";
import { BaseEntityFieldsSchema } from "../../../common/types/base-entity-fields";

export const UserSessionSchema = BaseEntityFieldsSchema.extend({
    expiresAt: z.iso.datetime(),
    token: z.string(),
    ipAddress: z.union([z.ipv4(), z.ipv6()]).nullable(),
    userAgent: z.string().nullable(),
    userId: z.ulid(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;
