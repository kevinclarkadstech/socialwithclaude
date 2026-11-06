import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostSchema, type Post } from "../types/post";
import { ListingStatusSchema, type ListingStatus } from "../types/post-listing";
import type { GetCallingUser } from "../../users/types/calling-user";

export const GetPostListingsQueryInputSchema = PageInputSchema.extend({
    status: ListingStatusSchema.optional(),
});

export type GetPostListingsQueryInput = z.infer<typeof GetPostListingsQueryInputSchema>;

export const GetPostListingsQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type GetPostListingsQueryOutput = z.infer<typeof GetPostListingsQueryOutputSchema>;

/** Listings, newest first; only those with `status` if given. */
export const getPostListingsQuery: Query<{ input: GetPostListingsQueryInput, output: GetPostListingsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getPostListings: (args: { status?: ListingStatus; viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const page = await dependencies.getPostListings({ ...input, viewerId: caller?.userId ?? null });
    return succeed(page);
}
