import type { schema } from "../../db";

export type ChatRow = typeof schema.chats.$inferSelect;

export type ChatMemberRow = typeof schema.chatMembers.$inferSelect;

export type PostRow = typeof schema.posts.$inferSelect;

export type PostMediaRow = typeof schema.postMedia.$inferSelect;

export type PostListingRow = typeof schema.postListings.$inferSelect;

export type PostCommentVoteRow = typeof schema.postCommentVotes.$inferSelect;

export type PostReportRow = typeof schema.postReports.$inferSelect;

export type PostCommentReportRow = typeof schema.postCommentReports.$inferSelect;

export type UserProfileRow = typeof schema.userProfiles.$inferSelect;

export type UserSettingsRow = typeof schema.userSettings.$inferSelect;

export type UserFollowRow = typeof schema.userFollows.$inferSelect;

export type UserBlockRow = typeof schema.userBlocks.$inferSelect;

export type UserFeedbackRow = typeof schema.userFeedback.$inferSelect;

export type SessionRow = typeof schema.sessions.$inferSelect;
