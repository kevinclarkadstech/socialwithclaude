import { z } from "zod";

import type { Query } from "../../../types/query";
import { EntityNotFoundError, UnexpectedError } from "../../../types/app-error";
import { fillVisiblePage, pageInput, type Page } from "../../../types/page";
import { fail, succeed } from "../../../types/result";
import { validate } from "../../../types/validate";
import { isBlocked, type BlockList } from "../../users/blocking";
import { commentSorts, type CommentSort, type PostComment } from "../types/post";

export const getPostCommentsInput = pageInput.extend({
    postId: z.string().min(1),
    sort: z.enum(commentSorts).default("oldest"),
});
export type GetPostCommentsInput = z.input<typeof getPostCommentsInput>;

export type GetPostCommentsDependencies = {
    /** The post's author, or null if the post doesn't exist or the viewer can't see it. */
    fetchPostAuthorId: (postId: string) => Promise<string | null>;
    /** A page of the post's comments in `sort` order (null if the post isn't visible). */
    fetchCommentsPage: (
        postId: string,
        sort: CommentSort,
        cursor: string | null,
        limit: number,
    ) => Promise<Page<PostComment> | null>;
    /** The viewer's block list (empty when signed out). */
    fetchBlockList: () => Promise<BlockList>;
};

/**
 * A page of a post's comments: "oldest" (default), "newest" or "top" first,
 * minus comments by users either of them blocked. "entity-not-found" if the
 * post doesn't exist, the viewer can't see it, or its author and the viewer
 * blocked each other. Pass `nextCursor` as `cursor`, keeping the same `sort`.
 */
export const getPostCommentsQuery: Query<
    { input: GetPostCommentsInput; output: Page<PostComment> },
    GetPostCommentsDependencies
> = async ({ input, context, dependencies }) => {
    const valid = validate(getPostCommentsInput, input);
    if (valid.error) return valid;
    const { postId, sort, cursor, limit } = valid.value;
    const notFound = () => fail(EntityNotFoundError("Post not found"));

    try {
        const [authorId, blockList] = await Promise.all([
            dependencies.fetchPostAuthorId(postId),
            dependencies.fetchBlockList(),
        ]);
        if (!authorId || isBlocked(blockList, authorId)) return notFound();

        let postVisible = true;
        const page = await fillVisiblePage(
            async (pageCursor, pageLimit) => {
                const fetched = await dependencies.fetchCommentsPage(postId, sort, pageCursor, pageLimit);
                if (!fetched) postVisible = false;
                return fetched ?? { items: [], nextCursor: null };
            },
            { cursor, limit },
            (comment) => !isBlocked(blockList, comment.author.userId),
            (comment) => comment.id,
        );
        return postVisible ? succeed(page) : notFound();
    } catch (err) {
        context.logger.error("getPostCommentsQuery failed", { err, postId });
        return fail(UnexpectedError());
    }
};
