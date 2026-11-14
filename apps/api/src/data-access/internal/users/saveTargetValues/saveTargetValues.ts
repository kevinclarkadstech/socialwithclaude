import type { UserSaveType } from "@myapp/shared/domains";

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
