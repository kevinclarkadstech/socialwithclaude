import type { ProfileVisibility } from "../../../users/types/user-settings";

/** Someone @-mentioned, with what deciding whether to tell them takes. */
export type MentionCandidate = {
    userId: string;
    // They follow the post's creator (accepted).
    followsCreator: boolean;
    // A block either way between them and whoever mentioned them.
    blockedWithActor: boolean;
    // A block either way between them and the post's creator.
    blockedWithCreator: boolean;
};

/**
 * Who of the people @-mentioned in a post (or a comment on it) to notify:
 * not whoever mentioned them, nobody across a block with them or the post's
 * creator, and only people who can see the post (a public creator, the
 * creator themselves, or an approved follower) — the same rule as canViewPost.
 */
export function mentionRecipients({ candidates, actorId, post }: {
    candidates: MentionCandidate[];
    actorId: string;
    post: { createdBy: string; profileVisibility: ProfileVisibility };
}): string[] {
    return candidates
        .filter((candidate) => {
            if (candidate.userId === actorId || candidate.blockedWithActor || candidate.blockedWithCreator) {
                return false;
            }
            return post.profileVisibility === "public" || candidate.userId === post.createdBy || candidate.followsCreator;
        })
        .map((candidate) => candidate.userId);
}
