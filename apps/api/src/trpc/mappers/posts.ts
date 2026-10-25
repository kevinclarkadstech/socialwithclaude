import type {
    Author,
    ListingDetails,
    Post,
    PostComment,
    PostDetail,
    PostMedia,
    SavedPost,
} from "@myapp/shared/domains/posts";

import type { getFeed, getPostById, getPostComments, getSavedPosts } from "../../data-access";

/*
 * Data-access rows → the public post types in @myapp/shared, which are the
 * source of truth for what the API returns. Listing every field (instead of
 * spreading rows) means a column added to a query isn't exposed by accident,
 * and a type change on either side fails to compile here.
 */

type FeedRow = Awaited<ReturnType<typeof getFeed>>["items"][number];
type PostByIdRow = NonNullable<Awaited<ReturnType<typeof getPostById>>>;
type SavedPostRow = Awaited<ReturnType<typeof getSavedPosts>>["items"][number];
type CommentRow = Awaited<ReturnType<typeof getPostComments>>["items"][number];

export const toAuthor = (row: FeedRow["author"]): Author => ({
    userId: row.userId,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
});

export const toPostMedia = (row: FeedRow["media"][number]): PostMedia => ({
    id: row.id,
    key: row.key,
    url: row.url,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    altText: row.altText,
});

export const toListingDetails = (row: NonNullable<PostByIdRow["listing"]>): ListingDetails => ({
    title: row.title,
    priceType: row.priceType,
    priceCents: row.priceCents,
    condition: row.condition,
    status: row.status,
    location: row.location,
    updatedAt: row.updatedAt.toISOString(),
});

export const toPost = (row: FeedRow): Post => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    numComments: row.numComments,
    numSaves: row.numSaves,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toAuthor(row.author),
    media: row.media.map(toPostMedia),
    isSaved: row.isSaved,
});

export const toPostDetail = (row: PostByIdRow): PostDetail => ({
    ...toPost(row),
    listing: row.listing && toListingDetails(row.listing),
});

export const toSavedPost = (row: SavedPostRow): SavedPost => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    numComments: row.numComments,
    numSaves: row.numSaves,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toAuthor(row.author),
    listing: row.listing && toListingDetails(row.listing),
    thumbnail: row.thumbnail && toPostMedia(row.thumbnail),
    savedAt: row.savedAt.toISOString(),
});

export const toPostComment = (row: CommentRow): PostComment => ({
    id: row.id,
    body: row.body,
    numUpvotes: row.numUpvotes,
    numDownvotes: row.numDownvotes,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toAuthor(row.author),
    myVote: Math.sign(row.myVote) as PostComment["myVote"],
});
