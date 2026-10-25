import { z } from "zod";

import type { Query } from "../../../types/query";
import { AuthorizationError, EntityNotFoundError, UnexpectedError } from "../../../types/app-error";
import { pageInput, type Page } from "../../../types/page";
import { fail, succeed } from "../../../types/result";
import { validate } from "../../../types/validate";
import { isBlocked, type BlockList } from "../../users/blocking";
import type { Post } from "../types/post";

export const getUserPostsInput = pageInput.extend({ username: z.string().min(1) });
export type GetUserPostsInput = z.input<typeof getUserPostsInput>;

/** What the query needs to know about the profile's owner. */
export type PostsAuthor = {
    userId: string;
    /** Whether the viewer is an accepted follower. */
    isFollowing: boolean;
    /** Whether their profile is followers-only. */
    requiresApproval: boolean;
};

export type GetUserPostsDependencies = {
    /** The user with this username, or null if there isn't one. */
    fetchAuthorByUsername: (username: string) => Promise<PostsAuthor | null>;
    /** A page of the user's regular posts the viewer may see, newest first. */
    fetchUserPostsPage: (authorId: string, cursor: string | null, limit: number) => Promise<Page<Post>>;
    /** The viewer's block list (empty when signed out). */
    fetchBlockList: () => Promise<BlockList>;
};

/**
 * A user's posts (their profile), newest first. "entity-not-found" if there's
 * no such user or either of them blocked the other; "authorization" if their
 * profile is followers-only and the viewer isn't them or an accepted follower.
 * Pass `nextCursor` as `cursor` for the next page.
 */
export const getUserPostsQuery: Query<
    { input: GetUserPostsInput; output: Page<Post> },
    GetUserPostsDependencies
> = async ({ input, context, dependencies }) => {
    const valid = validate(getUserPostsInput, input);
    if (valid.error) return valid;
    const { username, cursor, limit } = valid.value;

    try {
        const [author, blockList] = await Promise.all([
            dependencies.fetchAuthorByUsername(username),
            dependencies.fetchBlockList(),
        ]);
        if (!author || isBlocked(blockList, author.userId)) {
            return fail(EntityNotFoundError("User not found"));
        }
        const isOwner = context.user?.id === author.userId;
        if (author.requiresApproval && !isOwner && !author.isFollowing) {
            return fail(AuthorizationError("Only followers can see these posts"));
        }
        return succeed(await dependencies.fetchUserPostsPage(author.userId, cursor ?? null, limit));
    } catch (err) {
        context.logger.error("getUserPostsQuery failed", { err, username });
        return fail(UnexpectedError());
    }
};
