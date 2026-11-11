import { describe, expect, it, mock } from "bun:test";
import type { UserProfile } from "../../types/user-profile";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { updateMyProfileMutation } from "./updateMyProfileMutation";

const edit = { username: "user1", firstName: "Maya", lastName: "Lopez", about: "Hi" };

function run({ username = edit.username, existing = null, updated = mockProfile({ ...edit }) }: {
    username?: string;
    existing?: UserProfile | null;
    updated?: UserProfile | null;
}) {
    const updateUserProfile = mock(async () => updated);
    const result = updateMyProfileMutation({
        input: { ...edit, username },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller(),
            getUserProfileByUsername: async () => existing,
            updateUserProfile,
        },
    });
    return { result, updateUserProfile };
}

describe("updateMyProfileMutation", () => {
    it("saves the name and about, keeping the username", async () => {
        const { result, updateUserProfile } = run({});
        expect(await result).toMatchObject({ ok: true, value: { firstName: "Maya" } });
        expect(updateUserProfile).toHaveBeenCalledWith({ ...edit, userId: mockCaller().userId });
    });

    it("changes the username when it's free", async () => {
        expect((await run({ username: "maya" }).result).ok).toBe(true);
    });

    it("refuses a username someone else has, before or during the update", async () => {
        expect(await run({ username: "user2", existing: mockProfile({ userId: userId2, username: "user2" }) }).result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(await run({ username: "user2", updated: null }).result).toMatchObject({ ok: false, error: { type: "conflict" } });
    });
});
