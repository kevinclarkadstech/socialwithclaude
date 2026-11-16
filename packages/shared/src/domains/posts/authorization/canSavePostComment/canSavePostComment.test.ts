import { describe, expect, it } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { mockCaller, mockPost, mockPostComment, userId2 } from "../../../../testing/fixtures";
import { canSavePostComment } from "./canSavePostComment";

const comment = mockPostComment();

const privatePost = mockPost({
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
    viewer: { hasSaved: false, followsCreator: false },
});

describe("canSavePostComment", () => {
    itAllowsAnyoneSignedUp(canSavePostComment, { post: mockPost(), comment });

    it("refuses a post the caller can't see", () => {
        expect(canSavePostComment({ caller: mockCaller(), post: privatePost, comment }).ok).toBe(false);
    });

    it("refuses across a block", () => {
        const blocked = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canSavePostComment({ caller: blocked, post: mockPost({ ...privatePost, creator: { ...privatePost.creator, profileVisibility: "public" } }), comment })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });

    it("refuses a comment whose author is blocked either way (their comments aren't shown)", () => {
        const byBlocked = mockPostComment({ createdBy: userId2 });
        const blockedBy = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        const blocking = mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } });
        expect(canSavePostComment({ caller: blockedBy, post: mockPost(), comment: byBlocked }).ok).toBe(false);
        expect(canSavePostComment({ caller: blocking, post: mockPost(), comment: byBlocked }).ok).toBe(false);
    });
});
