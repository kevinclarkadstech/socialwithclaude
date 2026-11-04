import z from "zod";
import { BaseEntityFieldsSchema } from "./base-entity-fields";

export const BaseUserCreatedEntitySchema = z.object({
    createdBy: z.ulid(),
    updatedBy: z.ulid(),
}).and(BaseEntityFieldsSchema);

export type BaseUserCreatedEntity = z.infer<typeof BaseUserCreatedEntitySchema>;