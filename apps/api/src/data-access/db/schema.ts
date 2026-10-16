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

export const posts = pgTable("posts", {
    id: ulidId(),
    authorId: text("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    numComments: integer("num_comments").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
}, (t) => [
    index("posts_author_id_idx").on(t.authorId, t.id),
    check("posts_num_comments_non_negative", sql`${t.numComments} >= 0`),
]);

export const comments = pgTable("comments", {
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
    index("comments_post_id_idx").on(t.postId, t.id),
    check("comments_num_upvotes_non_negative", sql`${t.numUpvotes} >= 0`),
    check("comments_num_downvotes_non_negative", sql`${t.numDownvotes} >= 0`),
]);

/** One vote per user per comment: 1 = upvote, -1 = downvote. */
export const commentVotes = pgTable("comment_votes", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    commentId: text("comment_id")
        .notNull()
        .references(() => comments.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index("comment_votes_comment_id_idx").on(t.commentId),
    check("comment_votes_value_valid", sql`${t.value} in (-1, 1)`),
]);

export const savedPosts = pgTable("saved_posts", {
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
    index("saved_posts_user_id_id_idx").on(t.userId, t.id),
    index("saved_posts_post_id_idx").on(t.postId),
]);
