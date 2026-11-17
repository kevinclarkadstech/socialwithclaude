import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import type { GetCallingUser } from "../../types/calling-user";
import { SuggestedPersonSchema, type SuggestedPerson } from "../../types/suggested-person";

export const GetSuggestedPeopleQueryInputSchema = z.object({
    limit: z.int().min(1).max(20).default(5),
});

export type GetSuggestedPeopleQueryInput = z.infer<typeof GetSuggestedPeopleQueryInputSchema>;

export const GetSuggestedPeopleQueryOutputSchema = z.array(SuggestedPersonSchema);

export type GetSuggestedPeopleQueryOutput = z.infer<typeof GetSuggestedPeopleQueryOutputSchema>;

/**
 * People to follow: first those followed by the most people the caller
 * follows, then the most-followed public accounts. Never the caller, anyone
 * they follow or asked to, or anyone blocked either way. Signed out: just
 * the most-followed public accounts.
 */
export const getSuggestedPeopleQuery: Query<{ input: GetSuggestedPeopleQueryInput, output: GetSuggestedPeopleQueryOutput }, {
    getCallingUser: GetCallingUser;
    getSuggestedPeople: (args: { callerId: string | null; excludedUserIds: string[]; limit: number }) => Promise<SuggestedPerson[]>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const people = await dependencies.getSuggestedPeople({
        callerId: caller?.userId ?? null,
        excludedUserIds: caller ? [caller.userId, ...blockedEitherWay(caller)] : [],
        limit: input.limit,
    });
    return succeed(people);
};
