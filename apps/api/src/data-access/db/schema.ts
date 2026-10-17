import { boolean, check, index, integer, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { monotonicFactory } from "ulid";

const commonFields = {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}

export const users = pgTable("users", {
    ...commonFields,
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
});

export const sessions = pgTable("sessions", {
    ...commonFields,
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
    ...commonFields,
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
});

export const verifications = pgTable("verifications", {
    ...commonFields,
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
});

export const profiles = pgTable("profiles", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    numFollowers: integer("num_followers").notNull().default(0),
    numFollowing: integer("num_following").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("profiles_username_lower_idx").on(sql`lower(${t.username})`),
    check("profiles_num_followers_non_negative", sql`${t.numFollowers} >= 0`),
    check("profiles_num_following_non_negative", sql`${t.numFollowing} >= 0`),
]);

export const userSettings = pgTable("user_settings", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    privateProfile: boolean("private_profile").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const follows = pgTable("follows", {
    followerId: text("follower_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_id_idx").on(t.followingId),
    check("follows_no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
]);
// ULIDs sort by creation time, so `id` doubles as a pagination cursor. Monotonic
// so IDs created in the same millisecond still sort in creation order.
const ulid = monotonicFactory();
const ulidId = () => text("id").primaryKey().$defaultFn(() => ulid());

export const postKinds = ["post", "listing"] as const;

export const posts = pgTable("posts", {
    id: ulidId(),
    authorId: text("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: postKinds }).notNull().default("post"),
    body: text("body").notNull(),
    numComments: integer("num_comments").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
}, (t) => [
    index("posts_author_id_idx").on(t.authorId, t.id),
    // Feed: one kind, newest first.
    index("posts_kind_id_idx").on(t.kind, t.id),
    check("posts_num_comments_non_negative", sql`${t.numComments} >= 0`),
    check("posts_kind_valid", sql`${t.kind} in ('post', 'listing')`),
]);

export const postComments = pgTable("post_comments", {
    id: ulidId(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    numUpvotes: integer("num_upvotes").notNull().default(0),
    numDownvotes: integer("num_downvotes").notNull().default(0),
    score: integer("score")
        .notNull()
        .generatedAlwaysAs(sql`"num_upvotes" - "num_downvotes"`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
}, (t) => [
    index("post_comments_post_id_idx").on(t.postId, t.id),
    check("post_comments_num_upvotes_non_negative", sql`${t.numUpvotes} >= 0`),
    check("post_comments_num_downvotes_non_negative", sql`${t.numDownvotes} >= 0`),
]);

/** One vote per user per comment: 1 = upvote, -1 = downvote. */
export const postCommentVotes = pgTable("post_comment_votes", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    commentId: text("comment_id")
        .notNull()
        .references(() => postComments.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index("post_comment_votes_comment_id_idx").on(t.commentId),
    check("post_comment_votes_value_valid", sql`${t.value} in (-1, 1)`),
]);

export const postSaves = pgTable("post_saves", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    // Time-ordered, used as the cursor for "my saved posts, newest first".
    id: text("id").notNull().unique().$defaultFn(() => ulid()),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index("post_saves_user_id_id_idx").on(t.userId, t.id),
    index("post_saves_post_id_idx").on(t.postId),
]);

export const listingPriceTypes = ["fixed", "negotiable", "free", "multiple"] as const;
export const listingConditions = ["new", "used"] as const;
export const listingStatuses = ["available", "pending", "sold"] as const;

/**
 * Extra details for posts with kind 'listing' (1:1 with posts). The post body
 * is the listing's description. Prices are integer cents.
 */
export const postListingDetails = pgTable("post_listing_details", {
    postId: text("post_id")
        .primaryKey()
        .references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // 'free' and 'multiple' ("multiple items, see description") have no price.
    priceType: text("price_type", { enum: listingPriceTypes }).notNull(),
    priceCents: integer("price_cents"),
    condition: text("condition", { enum: listingConditions }),
    status: text("status", { enum: listingStatuses }).notNull().default("available"),
    location: text("location"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    // Marketplace feed: filter by status, newest first.
    index("post_listing_details_status_post_id_idx").on(t.status, t.postId),
    check("post_listing_details_price_type_valid", sql`${t.priceType} in ('fixed', 'negotiable', 'free', 'multiple')`),
    check("post_listing_details_condition_valid", sql`${t.condition} in ('new', 'used')`),
    check("post_listing_details_status_valid", sql`${t.status} in ('available', 'pending', 'sold')`),
    check("post_listing_details_price_non_negative", sql`${t.priceCents} >= 0`),
    check(
        "post_listing_details_price_matches_type",
        sql`(${t.priceType} in ('fixed', 'negotiable')) = (${t.priceCents} is not null)`,
    ),
]);

/**
 * Photos attached to a post, in display order. Rows only exist for submitted
 * posts; abandoned uploads never get a row (storage expires them).
 */
export const postMedia = pgTable("post_media", {
    id: ulidId(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("post_media_post_id_position_idx").on(t.postId, t.position),
    check("post_media_position_range", sql`${t.position} between 0 and 9`),
    check("post_media_mime_type_valid", sql`${t.mimeType} in ('image/jpeg', 'image/png', 'image/webp')`),
    check("post_media_size_valid", sql`${t.sizeBytes} > 0 and ${t.sizeBytes} <= 1048576`),
    check("post_media_dimensions_positive", sql`${t.width} > 0 and ${t.height} > 0`),
]);

export const postReportReasons = [
    "spam",
    "harassment",
    "hate",
    "violence",
    "sexual_content",
    "scam",
    "prohibited_item",
    "other",
] as const;
export const postReportStatuses = ["open", "reviewed", "dismissed"] as const;

/** One report per user per post; reporting again updates reason/details. */
export const postReports = pgTable("post_reports", {
    id: ulidId(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: postReportReasons }).notNull(),
    details: text("details"),
    status: text("status", { enum: postReportStatuses }).notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    uniqueIndex("post_reports_reporter_id_post_id_idx").on(t.reporterId, t.postId),
    index("post_reports_post_id_idx").on(t.postId),
    // Moderation queue: open reports, oldest first.
    index("post_reports_status_id_idx").on(t.status, t.id),
    check(
        "post_reports_reason_valid",
        sql`${t.reason} in ('spam', 'harassment', 'hate', 'violence', 'sexual_content', 'scam', 'prohibited_item', 'other')`,
    ),
    check("post_reports_status_valid", sql`${t.status} in ('open', 'reviewed', 'dismissed')`),
]);
