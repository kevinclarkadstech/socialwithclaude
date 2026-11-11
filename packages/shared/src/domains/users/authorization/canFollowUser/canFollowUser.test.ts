import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { itAllowsOnlySomeoneElse } from "../../../../testing/authorization";
import { canFollowUser } from "./canFollowUser";

describe("canFollowUser", () => {
    itAllowsOnlySomeoneElse(canFollowUser);
});

describe("canFollowUser and blocks", () => {
    it("refuses when they blocked you (as not-found) or you blocked them", () => {
        expect(canFollowUser({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(canFollowUser({ caller: mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
