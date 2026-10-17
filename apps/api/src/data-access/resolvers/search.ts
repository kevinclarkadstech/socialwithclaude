import type { Database } from "../db";
import { searchProfiles } from "./index";
import { searchPosts } from "./posts";

/**
 * Global search. Reads only through the profile and post resolvers and maps
 * their rows to search results, so it never queries those tables itself.
 *
 * Every result has `type`, `id`, `title` and `imageUrl`, enough for a generic
 * result row; each type adds what its row needs.
 */

type ProfileRow = Awaited<ReturnType<typeof searchProfiles>>[number];
type PostRow = Awaited<ReturnType<typeof searchPosts>>["items"][number];

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

/** Users matching `query`, best match first (see searchProfiles). */
export async function searchUsers(db: Database, query: string, { limit }: { limit: number }) {
    const profiles = await searchProfiles(db, query, { limit });
    return profiles.map(toUserSearchResult);
}

/**
 * Posts and/or listings matching `query`, newest first (see searchPosts).
 * Pass the previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function searchPostsAndListings(
    db: Database,
    query: string,
    options: { kind?: "post" | "listing" | null; cursor?: string | null; limit: number },
) {
    const page = await searchPosts(db, query, options);
    return { items: page.items.map(toPostSearchResult), nextCursor: page.nextCursor };
}
