import z from "zod";
import type { Query } from "../../../types/query";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { UserProfileSchema, type UserProfile } from "../../users/types/user-profile";
import { PostSchema, type Post } from "../types/post";
import type { GetCallingUser } from "../../users/types/calling-user";

export const GetUserPostsQueryInputSchema = PageInputSchema.extend({
    username: UserProfileSchema.shape.username,
});

export type GetUserPostsQueryInput = z.infer<typeof GetUserPostsQueryInputSchema>;

export const GetUserPostsQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type GetUserPostsQueryOutput = z.infer<typeof GetUserPostsQueryOutputSchema>;

/** A user's posts and listings, newest first. Not found if the user doesn't exist. */
export const getUserPostsQuery: Query<{ input: GetUserPostsQueryInput, output: GetUserPostsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    getPosts: (args: { createdBy?: string; viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername({ username: input.username });
    if (!profile) {
        logger.info("User not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const page = await dependencies.getPosts({
        createdBy: profile.userId,
        viewerId: caller?.userId ?? null,
        cursor: input.cursor,
        limit: input.limit,
    });
    return succeed(page);
}
