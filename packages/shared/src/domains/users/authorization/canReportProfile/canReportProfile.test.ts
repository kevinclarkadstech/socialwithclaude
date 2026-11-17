import { describe, expect, it } from "bun:test";
import { itAllowsOnlySomeoneElse } from "../../../../testing/authorization";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { canReportProfile } from "./canReportProfile";

describe("canReportProfile", () => {
    itAllowsOnlySomeoneElse(canReportProfile);

    it("allows across a block, either way", () => {
        const target = mockProfile({ userId: userId2 });
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canReportProfile({ caller: blocking, target }).ok).toBe(true);
        expect(canReportProfile({ caller: blockedBy, target }).ok).toBe(true);
    });
});
