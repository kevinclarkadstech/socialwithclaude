import { describe, expect, it, mock } from "bun:test";
import type { CallingUser } from "../../users/types/calling-user";
import type { UserFollow } from "../../users/types/user-follow";
import type { ProfileVisibility } from "../../users/types/user-settings";
import { mockCaller, mockPost, mockProfile, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { getUserPostsQuery, type UserPostsType } from "./getUserPostsQuery";

const target = mockProfile({ userId: userId2, username: "user2" });

function run({ caller = mockCaller(), visibility = "public", follow = null, type }: {
    caller?: CallingUser | null;
    visibility?: ProfileVisibility;
    follow?: UserFollow["status"] | null;
    type?: UserPostsType;
}) {
    const getPostViews = mock(async () => ({ items: [mockPost({ createdBy: userId2 })], nextCursor: null }));
    const result = getUserPostsQuery({
        input: { username: target.username, type, cursor: null, limit: 20 },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getUserProfileByUsername: async () => target,
            getProfileVisibility: async () => visibility,
            getUserFollowStatus: async () => follow,
            getPostViews,
        },
    });
    return { result, getPostViews };
}

describe("getUserPostsQuery", () => {
    it.each([
        [undefined, undefined],
        ["posts", undefined],
        ["listings", true],
    ] as const)("type %s asks for isListing %s", async (type, isListing) => {
        const { result, getPostViews } = run({ type });
        expect((await result).ok).toBe(true);
        expect(getPostViews).toHaveBeenCalledWith(expect.objectContaining({ createdBy: userId2, isListing }));
    });

    it("refuses a followers-only profile until the follow is accepted", async () => {
        expect(await run({ visibility: "followers" }).result).toMatchObject({ ok: false, error: { type: "authorization", message: "This account is private" } });
        expect(await run({ visibility: "followers", follow: "pending" }).result).toMatchObject({ ok: false });
        expect((await run({ visibility: "followers", follow: "accepted" }).result).ok).toBe(true);
    });

    it("hides them both ways when blocked", async () => {
        expect(await run({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }) }).result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(await run({ caller: mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } }) }).result).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
