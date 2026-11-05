import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostSchema, type Post } from "../types/post";
import type { GetCallingUser } from "../../users/types/calling-user";

export const GetFeedQueryInputSchema = PageInputSchema;

export type GetFeedQueryInput = z.infer<typeof GetFeedQueryInputSchema>;

export const GetFeedQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type GetFeedQueryOutput = z.infer<typeof GetFeedQueryOutputSchema>;

/** Every post and listing, newest first. */
export const getFeedQuery: Query<{ input: GetFeedQueryInput, output: GetFeedQueryOutput }, {
    getCallingUser: GetCallingUser;
    getPosts: (args: { viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const page = await dependencies.getPosts({ ...input, viewerId: caller?.userId ?? null });
    return succeed(page);
}
