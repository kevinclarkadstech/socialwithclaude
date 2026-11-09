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

/**
 * The sizes each post photo is stored at, by its longer side (photos keep
 * their shape). The app resizes on the device and uploads every size: 320 for
 * grid tiles, 640 for cards, 1280 for full screen.
 */
export const postPhotoSizes = [320, 640, 1280] as const;

/** The most a photo's longer side may be over its shorter one (3:1 panoramas, 1:3 tall shots). */
export const maxPhotoAspectRatio = 3;
