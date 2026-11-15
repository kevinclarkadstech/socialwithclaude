import { describe, expect, it, mock } from "bun:test";
import type { CallingUser } from "../../types/calling-user";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { blockUserMutation } from "./blockUserMutation";

const target = mockProfile({ userId: userId2, username: "user2" });

function run(caller: CallingUser | null, username = target.username) {
    const blockUser = mock(async () => ({ userId: mockCaller().userId, blockedUserId: userId2, createdAt: "2026-01-01T00:00:00.000Z" }));
    const removeFollowsBetween = mock(async () => {});
    const result = blockUserMutation({
        input: { username },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getUserProfileByUsername: async () => (username === target.username ? target : mockProfile()),
            blockUser,
            removeFollowsBetween,
        },
    });
    return { result, blockUser, removeFollowsBetween };
}

describe("blockUserMutation", () => {
    it("blocks, and ends any follow between the two", async () => {
        const { result, blockUser, removeFollowsBetween } = run(mockCaller());
        expect((await result).ok).toBe(true);
        expect(blockUser).toHaveBeenCalledWith({ userId: mockCaller().userId, blockedUserId: userId2 });
        expect(removeFollowsBetween).toHaveBeenCalledWith({ userId: mockCaller().userId, otherUserId: userId2 });
    });

    it("touches nothing when blocking isn't allowed", async () => {
        const { result, blockUser, removeFollowsBetween } = run(null);
        expect((await result).ok).toBe(false);
        expect(blockUser).not.toHaveBeenCalled();
        expect(removeFollowsBetween).not.toHaveBeenCalled();
    });
});
