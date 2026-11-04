import { ListingConditionSchema, ListingTypeSchema, ListingStatusSchema } from "../types/post-listing";
import { ReportReasonSchema, ReportStatusSchema } from "../types/report";

export const listingPriceTypes = ListingTypeSchema.options;
export const listingConditions = ListingConditionSchema.options;
export const listingStatuses = ListingStatusSchema.options;
export const reportReasons = ReportReasonSchema.options;
export const reportStatuses = ReportStatusSchema.options;
