import { boolean, check, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql, type AnyColumn } from "drizzle-orm";
import {
    listingConditions,
    listingPriceTypes,
    listingStatuses,
    profileVisibilities,
    reportReasons,
    reportStatuses,
    userFeedbackCategories,
    userFeedbackStatuses,
    userFollowStatuses,
    type Post,
    type PostComment,
} from "@myapp/shared/domains";
import { newId } from "./new-id";

/** A const list as the non-empty tuple Drizzle's `enum` option wants. */
const asEnum = <T extends string>(values: readonly T[]) => values as [T, ...T[]];

/** `column in ('a', 'b', …)` for CHECK constraints built from a const list. */
const isOneOf = (column: AnyColumn, values: readonly string[]) =>
    sql`${column} in (${sql.raw(values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", "))})`;

const timestamps = () => ({
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/*
 * Auth (better-auth's tables). better-auth creates these rows, with ids from
 * newId() (see advanced.database.generateId); the default is for anything
 * else that inserts them.
 */

const authFields = () => ({
    id: text("id").primaryKey().$defaultFn(newId),
    ...timestamps(),
});

export const users = pgTable("users", {
    ...authFields(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
}, (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
]);

export const sessions = pgTable("sessions", {
    ...authFields(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
}, (t) => [
    index("sessions_user_id_idx").on(t.userId),
]);

export const accounts = pgTable("accounts", {
    ...authFields(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
}, (t) => [
    uniqueIndex("accounts_provider_account_idx").on(t.providerId, t.accountId),
    index("accounts_user_id_idx").on(t.userId),
]);

export const verifications = pgTable("verifications", {
    ...authFields(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
    index("verifications_identifier_idx").on(t.identifier),
]);

/*
 * Everything below has client-generated ids (ULIDs), passed in on create.
 */

/**
 * Who created and last changed a user-created record, and when. On insert
 * set `updatedBy` to the creator; on each change set `updatedBy` and
 * `updatedAt`. Deleting a user deletes what they created; their edits on
 * other people's records stay, with `updatedBy` cleared.
 */
const auditFields = () => ({
    createdBy: text("created_by")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps(),
});

// Users

export const userProfiles = pgTable("user_profiles", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    about: text("about"),
    numFollowers: integer("num_followers").notNull().default(0),
    numFollowing: integer("num_following").notNull().default(0),
    ...timestamps(),
}, (t) => [
    uniqueIndex("user_profiles_username_lower_idx").on(sql`lower(${t.username})`),
    check("user_profiles_num_followers_non_negative", sql`${t.numFollowers} >= 0`),
    check("user_profiles_num_following_non_negative", sql`${t.numFollowing} >= 0`),
]);

/** One row per user, created at sign-up. One column per setting. */
export const userSettings = pgTable("user_settings", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    // Display
    darkModeEnabled: boolean("dark_mode_enabled").notNull().default(false),
    // Privacy and security
    followersCanTag: boolean("followers_can_tag").notNull().default(true),
    nonFollowersCanTag: boolean("non_followers_can_tag").notNull().default(false),
    profileVisibility: text("profile_visibility", { enum: asEnum(profileVisibilities) }).notNull().default("public"),
    ...timestamps(),
}, (t) => [
    check("user_settings_profile_visibility_valid", isOneOf(t.profileVisibility, profileVisibilities)),
]);

/**
 * `follower_id` follows (or asked to follow) `following_id`. Only accepted
 * follows count in user_profiles.num_followers / num_following. Unfollowing
 * deletes the row.
 */
export const userFollows = pgTable("user_follows", {
    followerId: text("follower_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: asEnum(userFollowStatuses) }).notNull().default("accepted"),
    ...timestamps(),
}, (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("user_follows_following_id_status_created_at_idx").on(t.followingId, t.status, t.createdAt),
    check("user_follows_no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
    check("user_follows_status_valid", isOneOf(t.status, userFollowStatuses)),
]);

/** `user_id` has blocked `blocked_user_id`. */
export const userBlocks = pgTable("user_blocks", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.blockedUserId] }),
    index("user_blocks_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("user_blocks_blocked_user_id_idx").on(t.blockedUserId),
    check("user_blocks_no_self_block", sql`${t.userId} <> ${t.blockedUserId}`),
]);

/** Feedback users send from the app. */
export const userFeedback = pgTable("user_feedback", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    category: text("category", { enum: asEnum(userFeedbackCategories) }).notNull(),
    message: text("message").notNull(),
    // Where it was sent from, to help reproduce bugs.
    pageUrl: text("page_url"),
    userAgent: text("user_agent"),
    status: text("status", { enum: asEnum(userFeedbackStatuses) }).notNull().default("new"),
    ...timestamps(),
}, (t) => [
    // Inbox: filter by status, oldest first.
    index("user_feedback_status_created_at_id_idx").on(t.status, t.createdAt, t.id),
    index("user_feedback_user_id_idx").on(t.userId),
    check("user_feedback_category_valid", isOneOf(t.category, userFeedbackCategories)),
    check("user_feedback_status_valid", isOneOf(t.status, userFeedbackStatuses)),
]);

// Posts

export const posts = pgTable("posts", {
    id: text("id").primaryKey(),
    // created_by is the author.
    content: text("content").notNull(),
    numSaves: integer("num_saves").notNull().default(0),
    numComments: integer("num_comments").notNull().default(0),
    numShares: integer("num_shares").notNull().default(0),
    numReactions: integer("num_reactions").notNull().default(0),
    ...auditFields(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
    // Lists sort by server time, not by id: ids come from clients, so their
    // embedded time isn't trusted.
    index("posts_created_at_id_idx").on(t.createdAt, t.id),
    index("posts_created_by_created_at_id_idx").on(t.createdBy, t.createdAt, t.id),
    check("posts_num_saves_non_negative", sql`${t.numSaves} >= 0`),
    check("posts_num_comments_non_negative", sql`${t.numComments} >= 0`),
    check("posts_num_shares_non_negative", sql`${t.numShares} >= 0`),
    check("posts_num_reactions_non_negative", sql`${t.numReactions} >= 0`),
]);

/** A post that is a listing has one of these (1:1). Prices are integer cents. */
export const postListings = pgTable("post_listings", {
    postId: text("post_id")
        .primaryKey()
        .references(() => posts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    // Only 'fixed' has a price.
    priceType: text("price_type", { enum: asEnum(listingPriceTypes) }).notNull(),
    priceCents: integer("price_cents"),
    isNegotiable: boolean("is_negotiable").notNull().default(false),
    condition: text("condition", { enum: asEnum(listingConditions) }).notNull(),
    status: text("status", { enum: asEnum(listingStatuses) }).notNull().default("available"),
    // Copy of posts.created_at, so listings can be filtered by status and
    // sorted by time from one index.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index("post_listings_status_created_at_post_id_idx").on(t.status, t.createdAt, t.postId),
    check("post_listings_price_type_valid", isOneOf(t.priceType, listingPriceTypes)),
    check("post_listings_condition_valid", isOneOf(t.condition, listingConditions)),
    check("post_listings_status_valid", isOneOf(t.status, listingStatuses)),
    check("post_listings_price_positive", sql`${t.priceCents} > 0`),
    check("post_listings_price_matches_type", sql`(${t.priceType} = 'fixed') = (${t.priceCents} is not null)`),
]);

export const postComments = pgTable("post_comments", {
    id: text("id").primaryKey(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    // created_by is the author.
    content: text("content").notNull(),
    numUpVotes: integer("num_up_votes").notNull().default(0),
    numDownVotes: integer("num_down_votes").notNull().default(0),
    // For sorting by "Best".
    score: integer("score")
        .notNull()
        .generatedAlwaysAs(sql`"num_up_votes" - "num_down_votes"`),
    ...auditFields(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
    index("post_comments_post_id_created_at_id_idx").on(t.postId, t.createdAt, t.id),
    check("post_comments_num_up_votes_non_negative", sql`${t.numUpVotes} >= 0`),
    check("post_comments_num_down_votes_non_negative", sql`${t.numDownVotes} >= 0`),
]);

/** One vote per user per comment: 1 = up, -1 = down. */
export const postCommentVotes = pgTable("post_comment_votes", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    postCommentId: text("post_comment_id")
        .notNull()
        .references(() => postComments.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    ...timestamps(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.postCommentId] }),
    index("post_comment_votes_post_comment_id_idx").on(t.postCommentId),
    check("post_comment_votes_value_valid", sql`${t.value} in (-1, 1)`),
]);

/**
 * One report per user per post; reporting again replaces the reason, details
 * and snapshot. `snapshot` is the post as it was when reported, so edits and
 * deletes don't hide what was reported.
 */
export const postReports = pgTable("post_reports", {
    id: text("id").primaryKey(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    // created_by is the reporter.
    reason: text("reason", { enum: asEnum(reportReasons) }).notNull(),
    details: text("details"),
    status: text("status", { enum: asEnum(reportStatuses) }).notNull().default("open"),
    snapshot: jsonb("snapshot").$type<Post>().notNull(),
    ...auditFields(),
}, (t) => [
    uniqueIndex("post_reports_created_by_post_id_idx").on(t.createdBy, t.postId),
    index("post_reports_post_id_idx").on(t.postId),
    // Moderation queue: filter by status, oldest first.
    index("post_reports_status_created_at_id_idx").on(t.status, t.createdAt, t.id),
    check("post_reports_reason_valid", isOneOf(t.reason, reportReasons)),
    check("post_reports_status_valid", isOneOf(t.status, reportStatuses)),
]);

/** Like post_reports, for comments. */
export const postCommentReports = pgTable("post_comment_reports", {
    id: text("id").primaryKey(),
    postCommentId: text("post_comment_id")
        .notNull()
        .references(() => postComments.id, { onDelete: "cascade" }),
    // created_by is the reporter.
    reason: text("reason", { enum: asEnum(reportReasons) }).notNull(),
    details: text("details"),
    status: text("status", { enum: asEnum(reportStatuses) }).notNull().default("open"),
    snapshot: jsonb("snapshot").$type<PostComment>().notNull(),
    ...auditFields(),
}, (t) => [
    uniqueIndex("post_comment_reports_created_by_post_comment_id_idx").on(t.createdBy, t.postCommentId),
    index("post_comment_reports_post_comment_id_idx").on(t.postCommentId),
    index("post_comment_reports_status_created_at_id_idx").on(t.status, t.createdAt, t.id),
    check("post_comment_reports_reason_valid", isOneOf(t.reason, reportReasons)),
    check("post_comment_reports_status_valid", isOneOf(t.status, reportStatuses)),
]);

// Chats

/**
 * A private conversation. Only 1:1 chats for now: `created_by` started it and
 * `receiver_id` is the other member. Each pair has one chat, whichever of
 * them started it. `receiver_id` is null for future group chats.
 */
export const chats = pgTable("chats", {
    id: text("id").primaryKey(),
    receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }),
    // Time of the newest message; null until the first one.
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    ...auditFields(),
}, (t) => [
    // Partial: least/greatest skip nulls, so group chats would otherwise
    // collide on their creator.
    uniqueIndex("chats_direct_pair_idx")
        .on(sql`least(${t.createdBy}, ${t.receiverId})`, sql`greatest(${t.createdBy}, ${t.receiverId})`)
        .where(sql`${t.receiverId} is not null`),
    check("chats_direct_not_self", sql`${t.createdBy} <> ${t.receiverId}`),
]);

export const chatMembers = pgTable("chat_members", {
    chatId: text("chat_id")
        .notNull()
        .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    // Messages after this are unread for this member.
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    // When the member deleted the chat for themselves: earlier messages are hidden for them.
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.chatId, t.userId] }),
    index("chat_members_user_id_created_at_idx").on(t.userId, t.createdAt),
]);

export const chatMessages = pgTable("chat_messages", {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
        .notNull()
        .references(() => chats.id, { onDelete: "cascade" }),
    // created_by is the sender.
    content: text("content").notNull(),
    ...auditFields(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
    index("chat_messages_chat_id_created_at_id_idx").on(t.chatId, t.createdAt, t.id),
]);

// Saves (after the tables they point at)

/**
 * Something a user saved: exactly one of post_id, post_comment_id and
 * chat_message_id is set. Each item can be saved once per user.
 */
export const userSaves = pgTable("user_saves", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    postCommentId: text("post_comment_id").references(() => postComments.id, { onDelete: "cascade" }),
    chatMessageId: text("chat_message_id").references(() => chatMessages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    uniqueIndex("user_saves_user_id_post_id_idx").on(t.userId, t.postId).where(sql`${t.postId} is not null`),
    uniqueIndex("user_saves_user_id_post_comment_id_idx")
        .on(t.userId, t.postCommentId)
        .where(sql`${t.postCommentId} is not null`),
    uniqueIndex("user_saves_user_id_chat_message_id_idx")
        .on(t.userId, t.chatMessageId)
        .where(sql`${t.chatMessageId} is not null`),
    // "My saves", newest first.
    index("user_saves_user_id_created_at_idx").on(t.userId, t.createdAt),
    check("user_saves_one_target", sql`num_nonnulls(${t.postId}, ${t.postCommentId}, ${t.chatMessageId}) = 1`),
]);
