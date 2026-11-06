import { describe, expect, it } from "bun:test";
import type { UserFollow } from "../types/user-follow";
import { mockCaller, mockProfile, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { getUserProfileQuery } from "./getUserProfileQuery";

const target = mockProfile({ userId: userId2, username: "user2" });

function follow(status: UserFollow["status"]): UserFollow {
    return { followerId: mockCaller().userId, followingId: userId2, status, createdAt: target.createdAt, updatedAt: target.updatedAt };
}

async function followStatusFor(caller: ReturnType<typeof mockCaller> | null, existing: UserFollow | null, profile = target) {
    const result = await getUserProfileQuery({
        input: { username: profile.username },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getUserProfileByUsername: async () => profile,
            getUserFollow: async () => existing,
        },
    });
    if (!result.ok) throw new Error("expected success");
    return result.value.viewer.followStatus;
}

describe("getUserProfileQuery viewer.followStatus", () => {
    it("is following once accepted", async () => {
        expect(await followStatusFor(mockCaller(), follow("accepted"))).toBe("following");
    });
    it("is requested while pending, and still requested once denied", async () => {
        expect(await followStatusFor(mockCaller(), follow("pending"))).toBe("requested");
        expect(await followStatusFor(mockCaller(), follow("denied"))).toBe("requested");
    });
    it("is none with no follow, when signed out, and on your own profile", async () => {
        expect(await followStatusFor(mockCaller(), null)).toBe("none");
        expect(await followStatusFor(null, follow("accepted"))).toBe("none");
        expect(await followStatusFor(mockCaller(), follow("accepted"), mockProfile())).toBe("none");
    });
});
