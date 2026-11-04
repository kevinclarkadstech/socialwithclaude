import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
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
}> = async ({ input, dependencies }) => {
    const post = await dependencies.getPostById({ id: input.id });
    if (!post?.listing) return notFound("Listing not found");

    const allowed = canUpdatePost(await dependencies.getCallingUser(), post);
    if (!allowed.ok) return allowed;

    const updated = await dependencies.updatePostListing({ ...input, userId: allowed.value.userId });
    if (!updated) return notFound("Listing not found");
    return succeed(updated);
}
