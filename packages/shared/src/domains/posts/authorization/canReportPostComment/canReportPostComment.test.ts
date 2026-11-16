import { describe, expect, it } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { mockCaller, mockPost, mockPostComment, userId2 } from "../../../../testing/fixtures";
import { canReportPostComment } from "./canReportPostComment";

const comment = mockPostComment();

const privatePost = mockPost({
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
    viewer: { hasSaved: false, followsCreator: false },
});

describe("canReportPostComment", () => {
    itAllowsAnyoneSignedUp(canReportPostComment, { post: mockPost(), comment });

    it("refuses a comment on a post the caller can't see", () => {
        expect(canReportPostComment({ caller: mockCaller(), post: privatePost, comment }).ok).toBe(false);
    });

    it("refuses across a block", () => {
        const blocked = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canReportPostComment({ caller: blocked, post: mockPost({ ...privatePost, creator: { ...privatePost.creator, profileVisibility: "public" } }), comment })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });

    it("refuses a comment whose author is blocked either way (their comments aren't shown)", () => {
        const byBlocked = mockPostComment({ createdBy: userId2 });
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        expect(canReportPostComment({ caller: blockedBy, post: mockPost(), comment: byBlocked }).ok).toBe(false);
        expect(canReportPostComment({ caller: blocking, post: mockPost(), comment: byBlocked }).ok).toBe(false);
    });
});
