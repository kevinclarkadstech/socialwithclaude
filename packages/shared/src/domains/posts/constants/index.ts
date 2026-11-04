import { ListingConditionSchema, ListingStatusSchema, ListingTypeSchema } from "../types/post-listing";

export const listingPriceTypes = ListingTypeSchema.options;
export const listingConditions = ListingConditionSchema.options;
export const listingStatuses = ListingStatusSchema.options;