import { z } from "zod";

import { searchVisiblePosts } from "./posts";
import { searchVisibleProfiles } from "./users";
import { procedure, router } from "../trpc";

/**
 * Global search. Gets results from the users and posts domains, which decide
 * what the caller can see, and maps them to search results.
 *
 * Every result has `type`, `id`, `title` and `imageUrl`, enough for a generic
 * result row; each type adds what its row needs.
 */

type ProfileRow = Awaited<ReturnType<typeof searchVisibleProfiles>>[number];
type PostRow = Awaited<ReturnType<typeof searchVisiblePosts>>["items"][number];

export type UserSearchResult = {
    type: "user";
    /** The user's id. */
    id: string;
    /** Full name, or the username when no name is set. */
    title: string;
    imageUrl: string | null;
    username: string;
    numFollowers: number;
};

type SearchResultAuthor = { userId: string; username: string; avatarUrl: string | null };

export type PostSearchResult = {
    type: "post";
    id: string;
    /** The start of the post body. */
    title: string;
    imageUrl: string | null;
    author: SearchResultAuthor;
    numComments: number;
    createdAt: Date;
};

export type ListingSearchResult = {
    type: "listing";
    /** The listing's post id. */
    id: string;
    title: string;
    imageUrl: string | null;
    author: SearchResultAuthor;
    priceType: NonNullable<PostRow["listing"]>["priceType"];
    priceCents: number | null;
    status: NonNullable<PostRow["listing"]>["status"];
    location: string | null;
    /** Whether the caller saved it (false when signed out). */
    isSaved: boolean;
    createdAt: Date;
};

export type SearchResult = UserSearchResult | PostSearchResult | ListingSearchResult;

const SNIPPET_LENGTH = 140;

/** The body on one line, cut to SNIPPET_LENGTH characters. */
function snippet(body: string) {
    const text = body.replace(/\s+/g, " ").trim();
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH - 1)}…` : text;
}

function toUserSearchResult(profile: ProfileRow): UserSearchResult {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    return {
        type: "user",
        id: profile.userId,
        title: name || profile.username,
        imageUrl: profile.avatarUrl,
        username: profile.username,
        numFollowers: profile.numFollowers,
    };
}

function toPostSearchResult(post: PostRow): PostSearchResult | ListingSearchResult {
    const author = {
        userId: post.author.userId,
        username: post.author.username,
        avatarUrl: post.author.avatarUrl,
    };
    const imageUrl = post.thumbnail?.url ?? null;

    if (post.kind === "listing" && post.listing) {
        return {
            type: "listing",
            id: post.id,
            title: post.listing.title,
            imageUrl,
            author,
            priceType: post.listing.priceType,
            priceCents: post.listing.priceCents,
            status: post.listing.status,
            location: post.listing.location,
            isSaved: post.isSaved,
            createdAt: post.createdAt,
        };
    }
    return {
        type: "post",
        id: post.id,
        title: snippet(post.body),
        imageUrl,
        author,
        numComments: post.numComments,
        createdAt: post.createdAt,
    };
}

function toPostSearchResults(page: Awaited<ReturnType<typeof searchVisiblePosts>>) {
    return { items: page.items.map(toPostSearchResult), nextCursor: page.nextCursor };
}

const query = z.string().trim().min(1).max(100);

/** Results per section in `global`. */
const GLOBAL_SECTION_SIZE = 5;

export const searchRouter = router({
    /**
     * The search screen: the top few users, posts and listings matching
     * `query`. To see more, pass a section's `nextCursor` to `posts` (with
     * that `kind`), or call `users` with a higher limit.
     */
    global: procedure.input(z.object({ query })).query(async ({ ctx, input }) => {
        const page = { limit: GLOBAL_SECTION_SIZE };
        const [users, posts, listings] = await Promise.all([
            searchVisibleProfiles(ctx, input.query, page),
            searchVisiblePosts(ctx, input.query, { kind: "post", ...page }),
            searchVisiblePosts(ctx, input.query, { kind: "listing", ...page }),
        ]);
        return {
            users: users.map(toUserSearchResult),
            posts: toPostSearchResults(posts),
            listings: toPostSearchResults(listings),
        };
    }),

    /** Users whose username or name starts with `query`, best match first. */
    users: procedure
        .input(z.object({ query, limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => {
            const users = await searchVisibleProfiles(ctx, input.query, input);
            return users.map(toUserSearchResult);
        }),

    /**
     * Listings whose title or description contains `query`, newest first
     * (the Listings page's search). Pass `nextCursor` as `cursor`.
     */
    listings: procedure
        .input(
            z.object({
                query,
                cursor: z.string().nullish(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { query, ...page } = input;
            const results = await searchVisiblePosts(ctx, query, { kind: "listing", ...page });
            return {
                items: results.items
                    .map(toPostSearchResult)
                    .filter((r): r is ListingSearchResult => r.type === "listing"),
                nextCursor: results.nextCursor,
            };
        }),

    /** Posts or listings containing `query`, newest first. Pass `nextCursor` as `cursor`. */
    posts: procedure
        .input(
            z.object({
                query,
                kind: z.enum(["post", "listing"]).default("post"),
                cursor: z.string().nullish(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { query, ...page } = input;
            return toPostSearchResults(await searchVisiblePosts(ctx, query, page));
        }),
});
