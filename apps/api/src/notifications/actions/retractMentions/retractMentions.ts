import { deleteMentionNotifications, getUserIdsByUsernames } from "../../../data-access";

/**
 * Takes back the "mentioned" notifications sent for a post, or a comment on
 * it, to the people `usernames` name: an edit took their mention out.
 */
export async function retractMentions({ postId, postCommentId, usernames }: {
    postId: string;
    postCommentId: string | null;
    usernames: string[];
}): Promise<void> {
    const userIds = await getUserIdsByUsernames({ usernames });
    await deleteMentionNotifications({ postId, postCommentId, userIds });
}
