import { describe, expect, it, mock } from "bun:test";
import type { UserProfile } from "../../types/user-profile";
import { mockCaller, mockProfile } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { createUserProfileMutation } from "./createUserProfileMutation";

const input = { username: "new_user", firstName: null, lastName: null, about: null, acceptedTermsVersion: "1.0", birthYear: 1995, birthMonth: 6 };

function run(created: UserProfile | "username-taken" | "profile-exists", birth: { birthYear: number; birthMonth: number } = input) {
    const createUserProfile = mock(async () => created);
    const deleteUnfinishedAccount = mock(async () => {});
    const result = createUserProfileMutation({
        input: { ...input, ...birth },
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller({ profile: null }),
            getUserProfileByUsername: async () => null,
            createUserProfile,
            deleteUnfinishedAccount,
        },
    });
    return Object.assign(result, { createUserProfile, deleteUnfinishedAccount });
}

describe("createUserProfileMutation", () => {
    it("returns the new profile", async () => {
        const profile = mockProfile({ username: input.username });
        expect(await run(profile)).toEqual({ ok: true, value: profile });
    });

    it("is a conflict when the username was taken before the insert", async () => {
        expect(await run("username-taken")).toMatchObject({ ok: false, error: { type: "conflict", message: "Username is taken" } });
    });

    it("is a conflict when another request created the profile first", async () => {
        expect(await run("profile-exists")).toMatchObject({ ok: false, error: { type: "conflict", message: "Profile already exists" } });
    });

    it("refuses someone under the minimum age, and deletes their unfinished account", async () => {
        const thisYear = new Date().getUTCFullYear();
        const call = run(mockProfile(), { birthYear: thisYear - 10, birthMonth: 1 });
        expect(await call).toMatchObject({ ok: false, error: { type: "validation", metadata: { reason: "under-minimum-age" } } });
        expect(call.createUserProfile).not.toHaveBeenCalled();
        expect(call.deleteUnfinishedAccount).toHaveBeenCalledWith({ userId: mockCaller().userId });
    });

    it("saves the birth month and year of someone old enough", async () => {
        const call = run(mockProfile());
        await call;
        expect(call.createUserProfile).toHaveBeenCalledWith(expect.objectContaining({ birthYear: 1995, birthMonth: 6 }));
        expect(call.deleteUnfinishedAccount).not.toHaveBeenCalled();
    });
});
