import { mentionRecipients } from "@myapp/shared/domains";
import { createNotifications, getMentionCandidates, getPostAccessById } from "../../../data-access";

/**
 * Sends "mentioned" notifications for a post, or a comment on it: to the
 * people `usernames` name who can see the post (see mentionRecipients),
 * except `excludedUserIds`. Nothing if the post is gone.
 */
export async function notifyMentions({ actorId, postId, postCommentId, usernames, excludedUserIds }: {
    actorId: string;
    postId: string;
    postCommentId: string | null;
    usernames: string[];
    excludedUserIds: string[];
}): Promise<void> {
    const post = await getPostAccessById({ id: postId, viewerId: null });
    if (!post) {
        return;
    }
    const candidates = await getMentionCandidates({ usernames, actorId, postCreatorId: post.createdBy });
    const recipients = mentionRecipients({ candidates, actorId, post: { createdBy: post.createdBy, profileVisibility: post.creator.profileVisibility } })
        .filter((userId) => !excludedUserIds.includes(userId));
    await createNotifications(recipients.map((userId) => ({ userId, actorId, type: "mentioned" as const, data: { postId, postCommentId } })));
}
