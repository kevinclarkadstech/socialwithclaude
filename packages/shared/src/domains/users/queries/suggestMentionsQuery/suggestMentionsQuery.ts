import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import type { GetCallingUser } from "../../types/calling-user";
import { UserProfileSummarySchema, type UserProfileSummary } from "../../types/user-profile-summary";

export const SuggestMentionsQueryInputSchema = z.object({
    // What's typed after "@": the start of a username, first name or last name.
    query: z.string().trim().toLowerCase().min(1).max(30),
    limit: z.int().min(1).max(20).default(8),
});

export type SuggestMentionsQueryInput = z.infer<typeof SuggestMentionsQueryInputSchema>;

export const SuggestMentionsQueryOutputSchema = z.array(UserProfileSummarySchema);

export type SuggestMentionsQueryOutput = z.infer<typeof SuggestMentionsQueryOutputSchema>;

/**
 * Who the caller can tag after typing "@" and `query`: people whose username,
 * first name or last name starts with it. Leaves out the caller and anyone
 * blocked either way. An exact username comes first, then people the caller
 * follows, then their followers, then everyone else by username.
 */
export const suggestMentionsQuery: Query<{ input: SuggestMentionsQueryInput, output: SuggestMentionsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getMentionSuggestions: (args: {
        callerId: string;
        query: string;
        excludedUserIds: string[];
        limit: number;
    }) => Promise<UserProfileSummary[]>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "suggest-mentions", callerId: caller?.userId },
        });
        return allowed;
    }

    const suggestions = await dependencies.getMentionSuggestions({
        ...input,
        callerId: allowed.value.userId,
        excludedUserIds: [allowed.value.userId, ...blockedEitherWay(allowed.value)],
    });
    return succeed(suggestions);
}
