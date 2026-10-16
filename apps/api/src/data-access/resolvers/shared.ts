import { isNull } from "drizzle-orm";

import { schema } from "../db";

/** Select shapes and conditions shared by the post and listing resolvers. */

export const authorFields = {
    userId: schema.profiles.userId,
    username: schema.profiles.username,
    firstName: schema.profiles.firstName,
    lastName: schema.profiles.lastName,
    avatarUrl: schema.profiles.avatarUrl,
};

export const postFields = {
    id: schema.posts.id,
    kind: schema.posts.kind,
    body: schema.posts.body,
    numComments: schema.posts.numComments,
    createdAt: schema.posts.createdAt,
    updatedAt: schema.posts.updatedAt,
};

/** Select after a LEFT JOIN on listings; Drizzle returns null when there's no row. */
export const listingFields = {
    title: schema.listings.title,
    priceType: schema.listings.priceType,
    priceCents: schema.listings.priceCents,
    condition: schema.listings.condition,
    status: schema.listings.status,
    location: schema.listings.location,
    updatedAt: schema.listings.updatedAt,
};

export const postNotDeleted = isNull(schema.posts.deletedAt);
