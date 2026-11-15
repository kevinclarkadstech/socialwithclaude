import { describe, expect, it } from "bun:test";
import { mockCaller, mockPost, userId2 } from "../../../../testing/fixtures";
import { viewablePosts } from "./viewablePosts";

const theirs = (profileVisibility: "public" | "followers", followsCreator = false) =>
    mockPost({
        createdBy: userId2,
        creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility },
        viewer: { hasSaved: false, followsCreator },
    });

describe("viewablePosts", () => {
    it("keeps only what the caller can see, in order", () => {
        const visible = theirs("public");
        const hidden = { ...theirs("followers"), id: "01JBBBBBBBBBBBBBBBBBBBBBB2" };
        expect(viewablePosts({ caller: mockCaller(), posts: [hidden, visible] })).toEqual([visible]);
    });
});

