import { describe, expect, it } from "bun:test";
import type { CallingUser } from "../../types/calling-user";
import type { UserFollow } from "../../types/user-follow";
import type { ProfileVisibility } from "../../types/user-settings";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { getUserProfileQuery } from "./getUserProfileQuery";

const target = mockProfile({ userId: userId2, username: "user2", numPosts: 7, numListings: 2 });

function follow(status: UserFollow["status"]): UserFollow {
    return { followerId: mockCaller().userId, followingId: userId2, status, createdAt: target.createdAt, updatedAt: target.updatedAt };
}

function run({ caller = mockCaller(), existing = null, profile = target, visibility = "public" }: {
    caller?: CallingUser | null;
    existing?: UserFollow | null;
    profile?: typeof target;
    visibility?: ProfileVisibility;
}) {
    return getUserProfileQuery({
        input: { username: profile.username },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getUserProfileByUsername: async () => profile,
            getProfileVisibility: async () => visibility,
            getUserFollowStatus: async () => existing?.status ?? null,
        },
    });
}

async function viewerFor(args: Parameters<typeof run>[0]) {
    const result = await run(args);
    if (!result.ok) throw new Error("expected success");
    return result.value.viewer;
}

const blockedBy = (userId: string) => mockCaller({ blockList: { blocking: [], blockedBy: [userId] } });
const blocking = (userId: string) => mockCaller({ blockList: { blocking: [userId], blockedBy: [] } });

describe("getUserProfileQuery", () => {
    it("returns the profile with its counts and visibility", async () => {
        expect(await run({ visibility: "followers" })).toMatchObject({ ok: true, value: { username: "user2", numPosts: 7, numListings: 2, profileVisibility: "followers" } });
    });

    it("is not found for someone the user has blocked", async () => {
        expect(await run({ caller: blockedBy(userId2) })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });

    it("says when the caller has blocked them, and hides their posts", async () => {
        expect(await viewerFor({ caller: blocking(userId2) })).toMatchObject({ hasBlocked: true, canSeePosts: false });
    });
});

describe("getUserProfileQuery viewer.followStatus", () => {
    it("is following once accepted", async () => {
        expect((await viewerFor({ existing: follow("accepted") })).followStatus).toBe("following");
    });
    it("is requested while pending, and still requested once denied", async () => {
        expect((await viewerFor({ existing: follow("pending") })).followStatus).toBe("requested");
        expect((await viewerFor({ existing: follow("denied") })).followStatus).toBe("requested");
    });
    it("is none with no follow, when signed out, and on your own profile", async () => {
        expect((await viewerFor({ existing: null })).followStatus).toBe("none");
        expect((await viewerFor({ caller: null, existing: follow("accepted") })).followStatus).toBe("none");
        expect((await viewerFor({ existing: follow("accepted"), profile: mockProfile() })).followStatus).toBe("none");
    });
});

describe("getUserProfileQuery viewer.canSeePosts", () => {
    it("is true for a public profile, signed in or out", async () => {
        expect((await viewerFor({})).canSeePosts).toBe(true);
        expect((await viewerFor({ caller: null })).canSeePosts).toBe(true);
    });
    it("is true for a followers-only profile only once the follow is accepted", async () => {
        expect((await viewerFor({ visibility: "followers" })).canSeePosts).toBe(false);
        expect((await viewerFor({ visibility: "followers", caller: null })).canSeePosts).toBe(false);
        expect((await viewerFor({ visibility: "followers", existing: follow("pending") })).canSeePosts).toBe(false);
        expect((await viewerFor({ visibility: "followers", existing: follow("accepted") })).canSeePosts).toBe(true);
    });
    it("is true on your own followers-only profile", async () => {
        expect((await viewerFor({ visibility: "followers", profile: mockProfile() })).canSeePosts).toBe(true);
    });
});
