import { describe, expect, it } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReportPost } from "./canReportPost";

const creator = { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z" };
const publicPost = mockPost({ createdBy: userId2, creator: { ...creator, profileVisibility: "public" } });
const privatePost = mockPost({ createdBy: userId2, creator: { ...creator, profileVisibility: "followers" }, viewer: { hasSaved: false, followsCreator: false } });

describe("canReportPost", () => {
    itAllowsAnyoneSignedUp(canReportPost, { post: mockPost() });

    it("allows across a block, either way (being blocked mid-report doesn't fail it)", () => {
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        expect(canReportPost({ caller: blockedBy, post: publicPost }).ok).toBe(true);
        expect(canReportPost({ caller: blocking, post: publicPost }).ok).toBe(true);
    });

    it("refuses a followers-only post the caller doesn't follow", () => {
        expect(canReportPost({ caller: mockCaller(), post: privatePost })).toMatchObject({ ok: false, error: { metadata: { reason: "followers-only" } } });
    });
});
