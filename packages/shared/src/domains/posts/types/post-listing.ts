import z from "zod";

export const ListingStatusSchema = z.enum(["available", "pending", "sold"]);
export const ListingTypeSchema = z.enum(["fixed", "free", "multiple"]);
export const ListingConditionSchema = z.enum(["new", "used"]);
const FixedPriceListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.fixed),
    price: z.number().positive(),
});
const FreeListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.free),
});
const MultipleListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.multiple),
});
const ListingPriceTypeSchema = z.discriminatedUnion("type", [
    FixedPriceListingSchema,
    FreeListingSchema,
    MultipleListingSchema,
]);

export const PostListingSchema = z.object({
    postId: z.ulid(),
    description: z.string().max(10000),
    condition: ListingConditionSchema,
    status: ListingStatusSchema,
    isNegotiable: z.boolean(),
}).and(ListingPriceTypeSchema);

export type ListingType = z.infer<typeof ListingTypeSchema>;
export type ListingCondition = z.infer<typeof ListingConditionSchema>;
export type ListingStatus = z.infer<typeof ListingStatusSchema>;
export type PostListing = z.infer<typeof PostListingSchema>;