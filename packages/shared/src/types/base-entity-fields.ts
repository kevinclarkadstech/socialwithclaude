import z from "zod";

export const BaseEntityFieldsSchema = z.object({
    id: z.ulid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type BaseEntityFields = z.infer<typeof BaseEntityFieldsSchema>;
