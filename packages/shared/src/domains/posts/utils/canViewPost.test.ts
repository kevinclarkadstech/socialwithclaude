import { describe, expect, it } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { canCommentOnPost, canReportPost } from "../../../logic/authorization/posts";
import { canViewPost, viewablePosts } from "./canViewPost";

const theirs = (profileVisibility: "public" | "followers", followsCreator = false) =>
    mockPost({
        createdBy: userId2,
        creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility },
        viewer: { hasSaved: false, followsCreator },
    });

describe("canViewPost", () => {
    it("allows a public profile's posts to anyone", () => {
        expect(canViewPost({ caller: null, post: theirs("public") }).ok).toBe(true);
    });
    it("allows a followers-only profile's posts to approved followers only", () => {
        expect(canViewPost({ caller: null, post: theirs("followers") }).ok).toBe(false);
        expect(canViewPost({ caller: mockCaller(), post: theirs("followers") }).ok).toBe(false);
        expect(canViewPost({ caller: mockCaller(), post: theirs("followers", true) }).ok).toBe(true);
    });
    it("allows your own posts on your followers-only profile", () => {
        expect(canViewPost({ caller: mockCaller({ userId: userId2 }), post: theirs("followers") }).ok).toBe(true);
    });
    it("refuses across a block, either way", () => {
        expect(canViewPost({ caller: mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } }), post: theirs("public") }).ok).toBe(false);
        expect(canViewPost({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }), post: theirs("public") }).ok).toBe(false);
    });
});

describe("viewablePosts", () => {
    it("keeps only what the caller can see, in order", () => {
        const visible = theirs("public");
        const hidden = { ...theirs("followers"), id: "01JBBBBBBBBBBBBBBBBBBBBBB2" };
        expect(viewablePosts({ caller: mockCaller(), posts: [hidden, visible] })).toEqual([visible]);
    });
});

describe("commenting on and reporting posts you can't see", () => {
    it("is refused", () => {
        expect(canCommentOnPost({ caller: mockCaller(), post: theirs("followers") }).ok).toBe(false);
        expect(canReportPost({ caller: mockCaller(), post: theirs("followers") }).ok).toBe(false);
        expect(canCommentOnPost({ caller: mockCaller(), post: theirs("followers", true) }).ok).toBe(true);
    });
});
