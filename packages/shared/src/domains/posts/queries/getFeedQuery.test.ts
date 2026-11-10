import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../types/post";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { getFeedQuery } from "./getFeedQuery";
import { getPostByIdQuery } from "./getPostByIdQuery";

const privatePost = mockPost({
    id: "01JBBBBBBBBBBBBBBBBBBBBBB2",
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
});
const publicPost = mockPost();

describe("getFeedQuery", () => {
    it("leaves out blocked users, and posts the caller can't see", async () => {
        const getPostViews = mock(async () => ({ items: [privatePost, publicPost], nextCursor: "next" }));
        const caller = mockCaller({ blockList: { blocking: ["01JAAAAAAAAAAAAAAAAAAAAAA3"], blockedBy: ["01JAAAAAAAAAAAAAAAAAAAAAA4"] } });
        const result = await getFeedQuery({
            input: { cursor: null, limit: 20 },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, getPostViews },
        });
        expect(getPostViews).toHaveBeenCalledWith(expect.objectContaining({
            excludedCreatorIds: ["01JAAAAAAAAAAAAAAAAAAAAAA3", "01JAAAAAAAAAAAAAAAAAAAAAA4"],
        }));
        // The cursor still follows what was fetched, so paging carries on past the dropped post.
        expect(result).toEqual({ ok: true, value: { items: [publicPost], nextCursor: "next" } });
    });
});

describe("getPostByIdQuery", () => {
    const run = (post: PostView) => getPostByIdQuery({
        input: { postId: post.id },
        context: testContext,
        dependencies: { getCallingUser: async () => mockCaller(), getPostViewById: async () => post },
    });
    it("is not found for a post the caller can't see", async () => {
        expect(await run(privatePost)).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("returns a post the caller can see", async () => {
        expect(await run(publicPost)).toEqual({ ok: true, value: { post: publicPost } });
    });
});
