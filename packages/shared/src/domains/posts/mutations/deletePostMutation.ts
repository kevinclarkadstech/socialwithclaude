import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canDeletePost } from "../../../logic/authorization/posts/canDeletePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type PostView } from "../types/post";
import { photoKeys } from "../../../common/photos/utils";
import { postPhotoSizes } from "../constants";

export const DeletePostMutationInputSchema = PostSchema.pick({ id: true });

export type DeletePostMutationInput = z.infer<typeof DeletePostMutationInputSchema>;

export const DeletePostMutationOutputSchema = z.null();

export type DeletePostMutationOutput = z.infer<typeof DeletePostMutationOutputSchema>;

/** Deletes a post (or listing), and its photos' files. */
export const deletePostMutation: Mutation<{ input: DeletePostMutationInput, output: DeletePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostViewById: (args: { id: string; viewerId: string | null }) => Promise<PostView | null>;
    deletePost: (args: { id: string; userId: string }) => Promise<boolean>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostViewById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post to delete not found", { postId: input.id });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canDeletePost({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "delete-post", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    const deleted = await dependencies.deletePost({ id: post.id, userId: allowed.value.userId });
    // Its photos go with it (their addresses only reached people shown the post).
    if (deleted && post.media.length > 0) {
        await dependencies.deleteMedia({
            keys: post.media.flatMap((item) => photoKeys({ userId: post.createdBy, parentId: post.id, photoId: item.id, sizes: postPhotoSizes })),
        });
    }
    return succeed();
}
