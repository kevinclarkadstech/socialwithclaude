import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";
import {
    ListingPriceSchema,
    PostListingFieldsSchema,
    type ListingCondition,
    type ListingPrice,
    type ListingStatus,
} from "../types/post-listing";

export const UpdatePostListingMutationInputSchema = PostSchema.pick({ id: true, content: true })
    .extend(PostListingFieldsSchema.pick({ title: true, description: true, condition: true, status: true, isNegotiable: true }).shape)
    .and(ListingPriceSchema);

export type UpdatePostListingMutationInput = z.infer<typeof UpdatePostListingMutationInputSchema>;

export const UpdatePostListingMutationOutputSchema = PostSchema;

export type UpdatePostListingMutationOutput = z.infer<typeof UpdatePostListingMutationOutputSchema>;

/** Replaces a listing's content and details. Not found for a post that isn't a listing. */
export const updatePostListingMutation: Mutation<{ input: UpdatePostListingMutationInput, output: UpdatePostListingMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string }) => Promise<Post | null>;
    updatePostListing: (args: {
        id: string;
        userId: string;
        content: string;
        title: string;
        description: string;
        condition: ListingCondition;
        status: ListingStatus;
        isNegotiable: boolean;
    } & ListingPrice) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const post = await dependencies.getPostById({ id: input.id });
    if (!post?.listing) {
        logger.info("Listing to update not found", { postId: input.id, isPost: Boolean(post) });
        return fail(notFoundError("Listing not found"));
    }

    const caller = await dependencies.getCallingUser();
    const allowed = canUpdatePost(caller, post);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-post-listing", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    const updatedPost = await dependencies.updatePostListing({ ...input, userId: allowed.value.userId });
    if (!updatedPost) {
        logger.info("Listing deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Listing not found"));
    }

    return succeed(updatedPost);
}
