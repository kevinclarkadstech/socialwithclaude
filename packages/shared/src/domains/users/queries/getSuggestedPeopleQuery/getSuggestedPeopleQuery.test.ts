import { describe, expect, it, mock } from "bun:test";
import { mockCaller, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { getSuggestedPeopleQuery } from "./getSuggestedPeopleQuery";

function run(caller: ReturnType<typeof mockCaller> | null) {
    const getSuggestedPeople = mock(async () => []);
    const result = getSuggestedPeopleQuery({ input: { limit: 5 }, context: testContext, dependencies: { getCallingUser: async () => caller, getSuggestedPeople } });
    return { result, getSuggestedPeople };
}

describe("getSuggestedPeopleQuery", () => {
    it("leaves out the caller and anyone blocked either way", async () => {
        const { result, getSuggestedPeople } = run(mockCaller({ blockList: { blocking: [userId2], blockedBy: ["01JAAAAAAAAAAAAAAAAAAAAAA3"] } }));
        expect((await result).ok).toBe(true);
        expect(getSuggestedPeople).toHaveBeenCalledWith({ callerId: userId1, excludedUserIds: [userId1, userId2, "01JAAAAAAAAAAAAAAAAAAAAAA3"], limit: 5 });
    });

    it("works signed out, with nobody to leave out", async () => {
        const { result, getSuggestedPeople } = run(null);
        expect((await result).ok).toBe(true);
        expect(getSuggestedPeople).toHaveBeenCalledWith({ callerId: null, excludedUserIds: [], limit: 5 });
    });
});
