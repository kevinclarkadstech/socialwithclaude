import { z } from "zod";

import type { Query } from "../../../types/query";
import { EntityNotFoundError, UnexpectedError } from "../../../types/app-error";
import { fail, succeed } from "../../../types/result";
import { validate } from "../../../types/validate";
import { isBlocked, type BlockList } from "../../users/blocking";
import type { PostDetail } from "../types";

export const getPostByIdInput = z.object({ id: z.string().min(1) });
export type GetPostByIdInput = z.input<typeof getPostByIdInput>;

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
    const valid = validate(getPostByIdInput, input);
    if (valid.error) return valid;

    try {
        const [post, blockList] = await Promise.all([
            dependencies.fetchPostById(valid.value.id),
            dependencies.fetchBlockList(),
        ]);
        if (!post || isBlocked(blockList, post.author.userId)) {
            return fail(EntityNotFoundError("Post not found"));
        }
        return succeed(post);
    } catch (err) {
        context.logger.error("getPostByIdQuery failed", { err, postId: valid.value.id });
        return fail(UnexpectedError());
    }
};
