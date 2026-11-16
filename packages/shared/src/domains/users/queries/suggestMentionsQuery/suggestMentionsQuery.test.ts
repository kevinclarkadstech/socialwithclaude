import { describe, expect, it } from "bun:test";
import type { CallingUser } from "../../types/calling-user";
import { mockCaller, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { suggestMentionsQuery } from "./suggestMentionsQuery";

const userId3 = "01JAAAAAAAAAAAAAAAAAAAAAA3";

async function run({ caller = mockCaller(), query = "Ma" }: { caller?: CallingUser | null; query?: string } = {}) {
    const calls: { callerId: string; query: string; excludedUserIds: string[]; limit: number }[] = [];
    const result = await suggestMentionsQuery({
        input: { query, limit: 8 },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getMentionSuggestions: async (args) => {
                calls.push(args);
                return [];
            },
        },
    });
    return { result, calls };
}

describe("suggestMentionsQuery", () => {
    it("asks for the caller's suggestions, leaving out themselves and anyone blocked either way", async () => {
        const { result, calls } = await run({
            caller: mockCaller({ blockList: { blocking: [userId2], blockedBy: [userId3] } }),
        });
        expect(result.ok).toBe(true);
        expect(calls).toEqual([{ callerId: userId1, query: "Ma", excludedUserIds: [userId1, userId2, userId3], limit: 8 }]);
    });

    it("needs a signed-in caller who has finished sign-up", async () => {
        const signedOut = await run({ caller: null });
        const midSignUp = await run({ caller: mockCaller({ profile: null }) });
        expect(signedOut.result.ok).toBe(false);
        expect(midSignUp.result.ok).toBe(false);
        expect(signedOut.calls).toEqual([]);
        expect(midSignUp.calls).toEqual([]);
    });
});
