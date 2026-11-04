import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canDeletePostComment } from "../../../logic/authorization/posts/canDeletePostComment";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostCommentSchema, type PostComment } from "../types/post-comment";

export const DeletePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true });

export type DeletePostCommentMutationInput = z.infer<typeof DeletePostCommentMutationInputSchema>;

export const DeletePostCommentMutationOutputSchema = z.undefined();

export type DeletePostCommentMutationOutput = z.infer<typeof DeletePostCommentMutationOutputSchema>;

export const deletePostCommentMutation: Mutation<{ input: DeletePostCommentMutationInput, output: DeletePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentById: (args: { id: string }) => Promise<PostComment | null>;
    deletePostComment: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const comment = await dependencies.getPostCommentById({ id: input.id });
    if (!comment) return notFound("Comment not found");

    const allowed = canDeletePostComment(await dependencies.getCallingUser(), comment);
    if (!allowed.ok) return allowed;

    await dependencies.deletePostComment({ id: input.id, userId: allowed.value.userId });
    return succeed();
}
