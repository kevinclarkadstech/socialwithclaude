import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canDeletePost } from "../../../logic/authorization/posts/canDeletePost";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";

export const DeletePostMutationInputSchema = PostSchema.pick({ id: true });

export type DeletePostMutationInput = z.infer<typeof DeletePostMutationInputSchema>;

export const DeletePostMutationOutputSchema = z.undefined();

export type DeletePostMutationOutput = z.infer<typeof DeletePostMutationOutputSchema>;

/** Deletes a post (or listing). */
export const deletePostMutation: Mutation<{ input: DeletePostMutationInput, output: DeletePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string }) => Promise<Post | null>;
    deletePost: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const post = await dependencies.getPostById({ id: input.id });
    if (!post) return notFound("Post not found");

    const allowed = canDeletePost(await dependencies.getCallingUser(), post);
    if (!allowed.ok) return allowed;

    await dependencies.deletePost({ id: input.id, userId: allowed.value.userId });
    return succeed();
}
