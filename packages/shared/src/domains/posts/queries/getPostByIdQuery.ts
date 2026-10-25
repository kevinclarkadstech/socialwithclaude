import { z } from "zod";

import type { Query } from "../../../types/query";
import { EntityNotFoundError, UnexpectedError } from "../../../types/app-error";
import { fail, succeed } from "../../../types/result";
import { isBlocked, type BlockList } from "../../users/blocking";
import type { PostDetail } from "../types";

export const getPostByIdInput = z.object({ id: z.string().min(1) });
/** Validated by tRPC with `getPostByIdInput` before the query runs (defaults applied). */
export type GetPostByIdInput = z.output<typeof getPostByIdInput>;

export type GetPostByIdDependencies = {
    /** The post if it exists and the viewer may see it (followers-only rules), else null. */
    fetchPostById: (postId: string) => Promise<PostDetail | null>;
    /** The viewer's block list (empty when signed out). */
    fetchBlockList: () => Promise<BlockList>;
};

/**
 * One post (or listing) with its photos and listing details. "entity-not-found"
 * if it doesn't exist, the viewer can't see it, or either of them blocked the other.
 */
export const getPostByIdQuery: Query<
    { input: GetPostByIdInput; output: PostDetail },
    GetPostByIdDependencies
> = async ({ input, context, dependencies }) => {
    try {
        const [post, blockList] = await Promise.all([
            dependencies.fetchPostById(input.id),
            dependencies.fetchBlockList(),
        ]);
        if (!post || isBlocked(blockList, post.author.userId)) {
            return fail(EntityNotFoundError("Post not found"));
        }
        return succeed(post);
    } catch (err) {
        context.logger.error("getPostByIdQuery failed", { err, postId: input.id });
        return fail(UnexpectedError());
    }
};
