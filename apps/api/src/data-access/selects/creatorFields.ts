import { schema } from "../db";

/** The creator's profile summary, from a join on user_profiles. */
export const creatorFields = {
    userId: schema.userProfiles.userId,
    username: schema.userProfiles.username,
    firstName: schema.userProfiles.firstName,
    lastName: schema.userProfiles.lastName,
};
