import { schema } from "./db";

/** The creator's profile summary, from a join on user_profiles. */
export const creatorFields = {
    userId: schema.userProfiles.userId,
    username: schema.userProfiles.username,
    firstName: schema.userProfiles.firstName,
    lastName: schema.userProfiles.lastName,
    updatedAt: schema.userProfiles.updatedAt,
};

/** A creator from creatorFields, as UserProfileSummary (timestamps as ISO strings). */
export function toCreator(creator: { userId: string; username: string; firstName: string | null; lastName: string | null; updatedAt: Date }) {
    return { ...creator, updatedAt: creator.updatedAt.toISOString() };
}
