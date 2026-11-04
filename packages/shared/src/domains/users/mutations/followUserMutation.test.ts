import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import type { UserSettings } from "../types/user-settings";
import { followUserMutation } from "./followUserMutation";

const target = mockProfile({ userId: userId2, username: "user2" });

function settings(profileVisibility: UserSettings["profileVisibility"]): UserSettings {
    return {
        userId: userId2,
        darkModeEnabled: false,
        followersCanTag: true,
        nonFollowersCanTag: false,
        profileVisibility,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
    };
}

function run(profileVisibility: UserSettings["profileVisibility"]) {
    const followUser = mock(async (args: { followerId: string; followingId: string; status: "accepted" | "pending" }) => ({
        ...args,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
    }));
    const result = followUserMutation({
        input: { username: "user2" },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            getUserProfileByUsername: async () => target,
            getUserSettings: async () => settings(profileVisibility),
            followUser,
        },
    });
    return { result, followUser };
}

describe("followUserMutation", () => {
    it("follows a public profile right away", async () => {
        const { result } = run("public");
        expect(await result).toMatchObject({ ok: true, value: { status: "accepted" } });
    });

    it("asks to follow a followers-only profile", async () => {
        const { result } = run("followers");
        expect(await result).toMatchObject({ ok: true, value: { status: "pending" } });
    });

    it("refuses following yourself", async () => {
        const result = await followUserMutation({
            input: { username: "user1" },
            context: testContext,
            dependencies: {
                getCallingUser: async () => mockCaller(),
                getUserProfileByUsername: async () => mockProfile(),
                getUserSettings: async () => settings("public"),
                followUser: async () => { throw new Error("should not be called"); },
            },
        });
        expect(result).toMatchObject({ ok: false, error: { type: "validation" } });
    });
});
