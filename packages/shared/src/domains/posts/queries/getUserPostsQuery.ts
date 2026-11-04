import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { UserProfileSchema, type UserProfile } from "../../users/types/user-profile";
import { PostSchema, type Post } from "../types/post";

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
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    getPosts: (args: { createdBy?: string; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername({ username: input.username });
    if (!profile) return notFound("User not found");
    return succeed(await dependencies.getPosts({ createdBy: profile.userId, cursor: input.cursor, limit: input.limit }));
}
