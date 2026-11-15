import { describe, expect, it } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { canSavePostComment } from "./canSavePostComment";

const privatePost = mockPost({
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
    viewer: { hasSaved: false, followsCreator: false },
});

describe("canSavePostComment", () => {
    itAllowsAnyoneSignedUp(canSavePostComment, { post: mockPost() });

    it("refuses a post the caller can't see", () => {
        expect(canSavePostComment({ caller: mockCaller(), post: privatePost }).ok).toBe(false);
    });

    it("refuses across a block", () => {
        const blocked = mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } });
        expect(canSavePostComment({ caller: blocked, post: mockPost({ ...privatePost, creator: { ...privatePost.creator, profileVisibility: "public" } }) })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});
