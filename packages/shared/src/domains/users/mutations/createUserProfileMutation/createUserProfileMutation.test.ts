import { describe, expect, it } from "bun:test";
import type { UserProfile } from "../../types/user-profile";
import { mockCaller, mockProfile } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { createUserProfileMutation } from "./createUserProfileMutation";

const input = { username: "new_user", firstName: null, lastName: null, about: null };

function run(created: UserProfile | "username-taken" | "profile-exists") {
    return createUserProfileMutation({
        input,
        context: testContext,
        dependencies: {
            getCallingUser: async () => mockCaller({ profile: null }),
            getUserProfileByUsername: async () => null,
            createUserProfile: async () => created,
        },
    });
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
});
