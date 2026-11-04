/**
 * Posts whose body (or, for listings, title) contains `query`
 * (case-insensitive), newest first, with authors, listing details, first
 * photo (`thumbnail`) and `isSaved` for `viewerId`. `kind` limits it to posts
 * or listings. Only posts `viewerId` can see (postVisibleTo). Pass the
 * previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function searchPosts(
    query: string,
    {
        kind,
        cursor,
        limit,
        viewerId = null,
    }: {
        kind?: (typeof schema.postKinds)[number] | null;
        cursor?: string | null;
        limit: number;
        viewerId?: string | null;
    },
) {
    const pattern = containsPattern(query);
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            listing: listingFields,
            thumbnail: postThumbnailSql,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(
            and(
                notDeleted,
                postVisibleTo(viewerId),
                kind ? eq(schema.posts.kind, kind) : undefined,
                or(ilike(schema.posts.body, pattern), ilike(schema.postListingDetails.title, pattern)),
                cursor ? postsBefore(db, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map(({ thumbnail, ...post }) => ({
            ...post,
            thumbnail: thumbnail && toMediaDto(thumbnail),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
}