/** A creator from creatorFields, as UserProfileSummary (timestamps as ISO strings). */
export function toCreator(creator: { userId: string; username: string; firstName: string | null; lastName: string | null; updatedAt: Date }) {
    return { ...creator, updatedAt: creator.updatedAt.toISOString() };
}
