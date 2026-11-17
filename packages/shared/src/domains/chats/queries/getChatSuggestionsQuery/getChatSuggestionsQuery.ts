import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { UserProfileSummarySchema, type UserProfileSummary } from "../../../users/types/user-profile-summary";

export const GetChatSuggestionsQueryInputSchema = z.object({
    limit: z.int().min(1).max(20).default(5),
});

export type GetChatSuggestionsQueryInput = z.infer<typeof GetChatSuggestionsQueryInputSchema>;

export const GetChatSuggestionsQueryOutputSchema = z.array(UserProfileSummarySchema);

export type GetChatSuggestionsQueryOutput = z.infer<typeof GetChatSuggestionsQueryOutputSchema>;

/**
 * People to message: those the caller follows but hasn't messaged with yet
 * (an opened chat with nothing sent doesn't count), most recently followed
 * first. Never anyone blocked either way.
 */
export const getChatSuggestionsQuery: Query<{ input: GetChatSuggestionsQueryInput, output: GetChatSuggestionsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getChatSuggestionProfiles: (args: { userId: string; excludedUserIds: string[]; limit: number }) => Promise<UserProfileSummary[]>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "get-chat-suggestions", callerId: caller?.userId } });
        return allowed;
    }
    const people = await dependencies.getChatSuggestionProfiles({
        userId: allowed.value.userId,
        excludedUserIds: blockedEitherWay(allowed.value),
        limit: input.limit,
    });
    return succeed(people);
};
