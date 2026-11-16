import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../types/user-profile";

export const SearchUsersQueryInputSchema = z.object({
    query: z.string().trim().min(1).max(100),
    limit: z.int().min(1).max(50).default(20),
});

export type SearchUsersQueryInput = z.infer<typeof SearchUsersQueryInputSchema>;

export const SearchUsersQueryOutputSchema = z.array(UserProfileSchema);

export type SearchUsersQueryOutput = z.infer<typeof SearchUsersQueryOutputSchema>;

/**
 * Profiles whose username, first name or last name starts with `query`
 * ("maya lo" matches a first and last name), leaving out anyone blocked
 * either way.
 */
export const searchUsersQuery: Query<{ input: SearchUsersQueryInput, output: SearchUsersQueryOutput }, {
    getCallingUser: GetCallingUser;
    searchUserProfiles: (args: { excludedUserIds?: string[]; query: string; limit: number }) => Promise<UserProfile[]>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const profiles = await dependencies.searchUserProfiles({ ...input, excludedUserIds: blockedEitherWay(caller) });
    return succeed(profiles);
}
