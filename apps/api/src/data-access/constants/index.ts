import type { UserSaveType } from "@myapp/shared/domains";

import { schema } from "../db";

/** The creator's profile summary, from a join on user_profiles. */
export const creatorFields = {
    userId: schema.userProfiles.userId,
    username: schema.userProfiles.username,
    firstName: schema.userProfiles.firstName,
    lastName: schema.userProfiles.lastName,
    updatedAt: schema.userProfiles.updatedAt,
};

/** The user_saves column that points at each type of saved item. */
export const saveTargetColumns = {
    post: schema.userSaves.postId,
    postComment: schema.userSaves.postCommentId,
    chatMessage: schema.userSaves.chatMessageId,
} satisfies Record<UserSaveType, unknown>;
