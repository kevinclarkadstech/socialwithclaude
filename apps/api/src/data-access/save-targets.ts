import type { UserSaveType } from "@myapp/shared/domains";
import { schema } from "./db";

/** The user_saves column that points at each type of saved item. */
export const saveTargetColumns = {
    post: schema.userSaves.postId,
    postComment: schema.userSaves.postCommentId,
    chatMessage: schema.userSaves.chatMessageId,
} satisfies Record<UserSaveType, unknown>;

/** user_saves values for a saved item of `type`. */
export function saveTargetValues(type: UserSaveType, id: string) {
    switch (type) {
        case "post":
            return { postId: id };
        case "postComment":
            return { postCommentId: id };
        case "chatMessage":
            return { chatMessageId: id };
    }
}
