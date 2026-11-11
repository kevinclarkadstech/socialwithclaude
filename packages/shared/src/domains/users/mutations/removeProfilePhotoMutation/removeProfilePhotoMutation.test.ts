import { describe, expect, it, mock } from "bun:test";
import { mockCaller, mockProfile } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { removeProfilePhotoMutation } from "./removeProfilePhotoMutation";

const caller = mockCaller();

describe("removeProfilePhotoMutation", () => {
    it("deletes every width and bumps the profile", async () => {
        const deleteMedia = mock(async (_args: { keys: string[] }) => {});
        const result = await removeProfilePhotoMutation({
            input: { kind: "avatar" },
            context: testContext,
            dependencies: { getCallingUser: async () => caller, deleteMedia, touchUserProfile: async () => mockProfile() },
        });
        expect(result.ok).toBe(true);
        expect(deleteMedia).toHaveBeenCalledWith({ keys: [`users/${caller.userId}/avatar-96`, `users/${caller.userId}/avatar-400`] });
    });
});
