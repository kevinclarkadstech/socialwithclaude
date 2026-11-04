import z from "zod";

export const ListingStatusSchema = z.enum(["available", "pending", "sold"]);
export const ListingTypeSchema = z.enum(["fixed", "free", "multiple"]);
export const ListingConditionSchema = z.enum(["new", "used"]);

const FixedPriceListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.fixed),
    priceCents: z.int().positive(),
});
const FreeListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.free),
});
const MultipleListingSchema = z.object({
    type: z.literal(ListingTypeSchema.enum.multiple),
});
export const ListingPriceSchema = z.discriminatedUnion("type", [
    FixedPriceListingSchema,
    FreeListingSchema,
    MultipleListingSchema,
]);

// Everything but the price, so inputs can pick from it (an intersection can't be picked).
export const PostListingFieldsSchema = z.object({
    postId: z.ulid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10000),
    condition: ListingConditionSchema,
    status: ListingStatusSchema,
    isNegotiable: z.boolean(),
});

export const PostListingSchema = PostListingFieldsSchema.and(ListingPriceSchema);

export type ListingType = z.infer<typeof ListingTypeSchema>;
export type ListingPrice = z.infer<typeof ListingPriceSchema>;
export type ListingCondition = z.infer<typeof ListingConditionSchema>;
export type ListingStatus = z.infer<typeof ListingStatusSchema>;
export type PostListing = z.infer<typeof PostListingSchema>;
