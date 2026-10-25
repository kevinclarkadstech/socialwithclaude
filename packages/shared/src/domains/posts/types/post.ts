import { z } from "zod";

import { listingConditions, listingPriceTypes, listingStatuses } from "../../../types/posts";

/** Timestamps are sent as ISO 8601 strings (the API has no Date transformer). */
const isoDateTime = z.iso.datetime({ offset: true });

/** Who wrote a post or comment. */
export const AuthorSchema = z.object({
    userId: z.string(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
});
export type Author = z.infer<typeof AuthorSchema>;

/** A photo attached to a post, with the URL to show it. */
export const PostMediaSchema = z.object({
    id: z.string(),
    key: z.string(),
    url: z.string(),
    mimeType: z.string(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    altText: z.string().nullable(),
});
export type PostMedia = z.infer<typeof PostMediaSchema>;

/** A listing's details (posts of kind "listing"); the post body is its description. */
export const ListingDetailsSchema = z.object({
    title: z.string(),
    priceType: z.enum(listingPriceTypes),
    /** Required for "fixed" / "negotiable"; null for "free" / "multiple". */
    priceCents: z.number().int().nullable(),
    condition: z.enum(listingConditions).nullable(),
    status: z.enum(listingStatuses),
    location: z.string().nullable(),
    updatedAt: isoDateTime,
});
export type ListingDetails = z.infer<typeof ListingDetailsSchema>;

/** Fields every post has. */
const PostBaseSchema = z.object({
    id: z.string(),
    kind: z.enum(["post", "listing"]),
    body: z.string(),
    numComments: z.number().int(),
    numSaves: z.number().int(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    author: AuthorSchema,
});

/** A post in a feed or on a profile, with its photos and whether you saved it. */
export const PostSchema = PostBaseSchema.extend({
    media: z.array(PostMediaSchema),
    isSaved: z.boolean(),
});
export type Post = z.infer<typeof PostSchema>;

/** One post (or listing) opened on its own: `listing` holds a listing's details, else null. */
export const PostDetailSchema = PostSchema.extend({
    listing: ListingDetailsSchema.nullable(),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;

/** A post you saved, with its first photo (`thumbnail`) and when you saved it. */
export const SavedPostSchema = PostBaseSchema.extend({
    listing: ListingDetailsSchema.nullable(),
    thumbnail: PostMediaSchema.nullable(),
    savedAt: isoDateTime,
});
export type SavedPost = z.infer<typeof SavedPostSchema>;

export const commentSorts = ["oldest", "newest", "top"] as const;
/** "top" is highest score first. */
export type CommentSort = (typeof commentSorts)[number];

/** A comment on a post, with your vote on it (1, -1, or 0 for none). */
export const PostCommentSchema = z.object({
    id: z.string(),
    body: z.string(),
    numUpvotes: z.number().int(),
    numDownvotes: z.number().int(),
    score: z.number().int(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    author: AuthorSchema,
    myVote: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});
export type PostComment = z.infer<typeof PostCommentSchema>;
