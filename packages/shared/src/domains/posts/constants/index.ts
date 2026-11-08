import { ListingConditionSchema, ListingTypeSchema, ListingStatusSchema } from "../types/post-listing";
import { ReportReasonSchema, ReportStatusSchema } from "../types/report";
import { PostTypeSchema } from "../types/post";

export const postTypes = PostTypeSchema.options;
export const listingPriceTypes = ListingTypeSchema.options;
export const listingConditions = ListingConditionSchema.options;
export const listingStatuses = ListingStatusSchema.options;
export const reportReasons = ReportReasonSchema.options;
export const reportStatuses = ReportStatusSchema.options;
