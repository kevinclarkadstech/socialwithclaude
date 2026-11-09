import { ListingConditionSchema, ListingTypeSchema, ListingStatusSchema } from "../types/post-listing";
import { ReportReasonSchema, ReportStatusSchema } from "../types/report";
import { PostTypeSchema } from "../types/post";
import { PhotoCaptionSchema } from "../types/post-media";

export const postTypes = PostTypeSchema.options;
export const listingPriceTypes = ListingTypeSchema.options;
export const listingConditions = ListingConditionSchema.options;
export const listingStatuses = ListingStatusSchema.options;
export const reportReasons = ReportReasonSchema.options;
export const reportStatuses = ReportStatusSchema.options;

/** The most photos a post or listing may have. */
export const maxPostPhotos = 10;

/** The longest a photo's caption may be. */
export const maxPhotoCaptionLength = PhotoCaptionSchema.maxLength!;
