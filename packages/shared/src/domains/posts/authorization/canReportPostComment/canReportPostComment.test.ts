import { describe, expect, it } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { canReportPostComment } from "./canReportPostComment";

const privatePost = mockPost({
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
    viewer: { hasSaved: false, followsCreator: false },
});
const publicPost = mockPost({ ...privatePost, creator: { ...privatePost.creator, profileVisibility: "public" } });

describe("canReportPostComment", () => {
    itAllowsAnyoneSignedUp(canReportPostComment, { post: mockPost() });

    it("refuses a comment on a post the caller can't see", () => {
        expect(canReportPostComment({ caller: mockCaller(), post: privatePost })).toMatchObject({ ok: false, error: { metadata: { reason: "followers-only" } } });
    });

    it("allows across a block, either way (being blocked mid-report doesn't fail it)", () => {
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        expect(canReportPostComment({ caller: blockedBy, post: publicPost }).ok).toBe(true);
        expect(canReportPostComment({ caller: blocking, post: publicPost }).ok).toBe(true);
    });

    it("still refuses a followers-only post across a block", () => {
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canReportPostComment({ caller: blockedBy, post: privatePost }).ok).toBe(false);
    });
});
