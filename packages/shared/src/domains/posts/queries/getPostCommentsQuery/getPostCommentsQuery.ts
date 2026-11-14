import z from "zod";
import type { Query } from "../../../../types/query";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { canViewPostComments } from "../../authorization/canViewPostComments/canViewPostComments";
import type { PostView } from "../../types/post";
import { PageInputSchema, type Page } from "../../../../types/page";
import { PostCommentViewSchema, type PostCommentView } from "../../types/post-comment";
import type { GetCallingUser } from "../../../users/types/calling-user";

export const GetPostCommentsQueryInputSchema = PageInputSchema.extend({
    postId: PostCommentViewSchema.shape.postId,
    order: z.enum(["oldest", "newest"]).default("oldest"),
});

export type GetPostCommentsQueryInput = z.infer<typeof GetPostCommentsQueryInputSchema>;

export const GetPostCommentsQueryOutputSchema = z.object({
    items: z.array(PostCommentViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetPostCommentsQueryOutput = z.infer<typeof GetPostCommentsQueryOutputSchema>;

/**
 * A post's comments, oldest first unless `order` is "newest". Needs sign-up
 * (canViewPostComments); not found if the post doesn't exist or the caller
 * can't see it, as for getPostById.
 */
export const getPostCommentsQuery: Query<{ input: GetPostCommentsQueryInput, output: GetPostCommentsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getPostViewById: (args: { id: string; viewerId: string | null }) => Promise<PostView | null>;
    getPostCommentViews: (args: {
        postId: string;
        viewerId: string | null;
        order: "oldest" | "newest";
        cursor?: string | null;
        limit: number;
    }) => Promise<Page<PostCommentView>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostViewById({ id: input.postId, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post not found", { postId: input.postId });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canViewPostComments({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "view-post-comments", callerId: caller?.userId, postId: post.id },
        });
        const reason = allowed.error.metadata?.reason;
        // Signed out or mid-sign-up: say so, so the app can ask them to sign in.
        if (reason === "not-signed-in" || reason === "profile-required") {
            return allowed;
        }
        // Can't see the post: not found, so a link doesn't reveal that a private or blocked post exists.
        return fail(notFoundError("Post not found"));
    }

    const page = await dependencies.getPostCommentViews({ ...input, viewerId: caller?.userId ?? null });
    return succeed(page);
}
