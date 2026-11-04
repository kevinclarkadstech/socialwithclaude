import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";

export const UpdatePostMutationInputSchema = PostSchema.pick({ id: true, content: true });

export type UpdatePostMutationInput = z.infer<typeof UpdatePostMutationInputSchema>;

export const UpdatePostMutationOutputSchema = PostSchema;

export type UpdatePostMutationOutput = z.infer<typeof UpdatePostMutationOutputSchema>;

/** Changes a post's (or listing's) content. */
export const updatePostMutation: Mutation<{ input: UpdatePostMutationInput, output: UpdatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string }) => Promise<Post | null>;
    updatePost: (args: { id: string; userId: string; content: string }) => Promise<Post | null>;
}> = async ({ input, dependencies }) => {
    const post = await dependencies.getPostById({ id: input.id });
    if (!post) return notFound("Post not found");

    const allowed = canUpdatePost(await dependencies.getCallingUser(), post);
    if (!allowed.ok) return allowed;

    const updated = await dependencies.updatePost({ ...input, userId: allowed.value.userId });
    if (!updated) return notFound("Post not found");
    return succeed(updated);
}
