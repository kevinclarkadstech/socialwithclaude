import { describe, expect, it, mock } from "bun:test";
import type { ProfileVisibility } from "../../types/user-settings";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { followUserMutation } from "./followUserMutation";

const target = mockProfile({ userId: userId2, username: "user2" });

function run(profileVisibility: ProfileVisibility, { failToNotify = false }: { failToNotify?: boolean } = {}) {
    const sendNotifications = mock(async () => {
        if (failToNotify) {
            throw new Error("notifications down");
        }
    });
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
            getProfileVisibility: async () => profileVisibility,
            followUser,
            sendNotifications,
        },
    });
    return { result, followUser, sendNotifications };
}

describe("followUserMutation", () => {
    it("follows a public profile right away, and tells them", async () => {
        const { result, sendNotifications } = run("public");
        expect(await result).toMatchObject({ ok: true, value: { status: "accepted" } });
        expect(sendNotifications).toHaveBeenCalledWith([{ userId: userId2, actorId: mockCaller().userId, type: "followed", data: {} }]);
    });

    it("asks to follow a followers-only profile, and tells them", async () => {
        const { result, sendNotifications } = run("followers");
        expect(await result).toMatchObject({ ok: true, value: { status: "pending" } });
        expect(sendNotifications).toHaveBeenCalledWith([expect.objectContaining({ type: "follow_requested" })]);
    });

    it("still follows when the notification can't be sent", async () => {
        const { result } = run("public", { failToNotify: true });
        expect(await result).toMatchObject({ ok: true, value: { status: "accepted" } });
    });

    it("refuses following yourself", async () => {
        const result = await followUserMutation({
            input: { username: "user1" },
            context: testContext,
            dependencies: {
                getCallingUser: async () => mockCaller(),
                getUserProfileByUsername: async () => mockProfile(),
                getProfileVisibility: async () => "public",
                followUser: async () => { throw new Error("should not be called"); },
                sendNotifications: async () => {},
            },
        });
        expect(result).toMatchObject({ ok: false, error: { type: "validation" } });
    });
});
