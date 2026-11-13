import z from "zod";
import { BaseEntityFieldsSchema } from "./base-entity-fields";

export const BaseUserCreatedEntitySchema = BaseEntityFieldsSchema.extend({
    createdBy: z.ulid(),
    // Null once the user who last changed it is deleted.
    updatedBy: z.ulid().nullable(),
});

export type BaseUserCreatedEntity = z.infer<typeof BaseUserCreatedEntitySchema>;
