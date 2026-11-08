import { describe, expect, it, mock } from "bun:test";
import type { Post } from "../types/post";
import { mockCaller, mockPost, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { getFeedQuery } from "./getFeedQuery";
import { getPostByIdQuery } from "./getPostByIdQuery";

const privatePost = mockPost({
    id: "01JBBBBBBBBBBBBBBBBBBBBBB2",
    createdBy: userId2,
    creator: { userId: userId2, username: "user2", firstName: null, lastName: null, profileVisibility: "followers" },
});
const publicPost = mockPost();

describe("getFeedQuery", () => {
    it("leaves out blocked users, and posts the caller may not see", async () => {
        const getPosts = mock(async () => ({ items: [privatePost, publicPost], nextCursor: "next" }));
        const caller = mockCaller({ blockList: { blocking: ["01JAAAAAAAAAAAAAAAAAAAAAA3"], blockedBy: ["01JAAAAAAAAAAAAAAAAAAAAAA4"] } });
        const result = await getFeedQuery({
            input: { cursor: null, limit: 20 },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, getPosts },
        });
        expect(getPosts).toHaveBeenCalledWith(expect.objectContaining({
            excludeCreatorIds: ["01JAAAAAAAAAAAAAAAAAAAAAA3", "01JAAAAAAAAAAAAAAAAAAAAAA4"],
        }));
        // The cursor still follows what was fetched, so paging carries on past the dropped post.
        expect(result).toEqual({ ok: true, value: { items: [publicPost], nextCursor: "next" } });
    });
});

describe("getPostByIdQuery", () => {
    const run = (post: Post) => getPostByIdQuery({
        input: { postId: post.id },
        context: testContext,
        dependencies: { getCallingUser: async () => mockCaller(), getPostById: async () => post },
    });
    it("is not found for a post the caller may not see", async () => {
        expect(await run(privatePost)).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
    it("returns a post the caller may see", async () => {
        expect(await run(publicPost)).toEqual({ ok: true, value: { post: publicPost } });
    });
});
