import { describe, expect, it } from "bun:test";
import type { CallingUser } from "../../../users/types/calling-user";
import { mockCaller, userId1 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { searchChatsQuery } from "./searchChatsQuery";

async function run(caller: CallingUser | null) {
    const calls: { viewerId: string; query: string }[] = [];
    const result = await searchChatsQuery({
        input: { query: "bike", limit: 20 },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            searchChatMessages: async (args) => {
                calls.push({ viewerId: args.viewerId, query: args.query });
                return { items: [], nextCursor: null };
            },
        },
    });
    return { result, calls };
}

describe("searchChatsQuery", () => {
    it("searches the caller's own chats", async () => {
        const { result, calls } = await run(mockCaller());
        expect(result.ok).toBe(true);
        expect(calls).toEqual([{ viewerId: userId1, query: "bike" }]);
    });

    it("needs a signed-in caller who has finished sign-up", async () => {
        const signedOut = await run(null);
        const midSignUp = await run(mockCaller({ profile: null }));
        expect([signedOut.result.ok, midSignUp.result.ok]).toEqual([false, false]);
        expect([...signedOut.calls, ...midSignUp.calls]).toEqual([]);
    });
});
