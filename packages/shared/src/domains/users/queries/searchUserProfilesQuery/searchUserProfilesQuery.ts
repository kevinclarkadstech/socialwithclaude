import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";

export const SearchUserProfilesQueryInputSchema = z.object({
    query: z.string().trim().min(1).max(100),
    limit: z.int().min(1).max(50).default(20),
});

export type SearchUserProfilesQueryInput = z.infer<typeof SearchUserProfilesQueryInputSchema>;

export const SearchUserProfilesQueryOutputSchema = z.array(UserProfileSchema);

export type SearchUserProfilesQueryOutput = z.infer<typeof SearchUserProfilesQueryOutputSchema>;

/** Profiles whose username or name contains `query`, leaving out anyone blocked either way. */
export const searchUserProfilesQuery: Query<{ input: SearchUserProfilesQueryInput, output: SearchUserProfilesQueryOutput }, {
    getCallingUser: GetCallingUser;
    searchUserProfiles: (args: { excludedUserIds?: string[]; query: string; limit: number }) => Promise<UserProfile[]>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const profiles = await dependencies.searchUserProfiles({ ...input, excludedUserIds: blockedEitherWay(caller) });
    return succeed(profiles);
}
