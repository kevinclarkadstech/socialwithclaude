import z from "zod";
import { BaseEntityFieldsSchema } from "../../../common/types/base-entity-fields";

export const UserSessionSchema = z.object({
    expiresAt: z.iso.datetime(),
    token: z.string(),
    ipAddress: z.ipv4(),
    userAgent: z.string(),
    userId: z.ulid(),
}).and(BaseEntityFieldsSchema);

export type UserSession = z.infer<typeof UserSessionSchema>;