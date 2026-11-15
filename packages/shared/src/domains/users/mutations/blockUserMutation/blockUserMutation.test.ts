import { describe, expect, it, mock } from "bun:test";
import type { CallingUser } from "../../types/calling-user";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { blockUserMutation } from "./blockUserMutation";

const target = mockProfile({ userId: userId2, username: "user2" });

function run(caller: CallingUser | null, username = target.username) {
    const blockUser = mock(async () => ({ userId: mockCaller().userId, blockedUserId: userId2, createdAt: "2026-01-01T00:00:00.000Z" }));
    const result = blockUserMutation({
        input: { username },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getUserProfileByUsername: async () => (username === target.username ? target : mockProfile()),
            blockUser,
        },
    });
    return { result, blockUser };
}

describe("blockUserMutation", () => {
    it("blocks someone else", async () => {
        const { result, blockUser } = run(mockCaller());
        expect((await result).ok).toBe(true);
        expect(blockUser).toHaveBeenCalledWith({ userId: mockCaller().userId, blockedUserId: userId2 });
    });

    it("touches nothing when blocking isn't allowed", async () => {
        const { result, blockUser } = run(null);
        expect((await result).ok).toBe(false);
        expect(blockUser).not.toHaveBeenCalled();
    });
});
