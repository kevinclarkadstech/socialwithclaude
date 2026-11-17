import { describe, expect, it } from "bun:test";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const jo = await createTestUser({ name: "jo", visibility: "followers" });
const maya = await createTestUser({ name: "maya" });

const requesters = async () => (await valueOf(jo.call.users.getMyFollowRequests({ limit: 20 }))).items.map((request) => request.follower.username);
const mayasStatus = async () => (await valueOf(maya.call.users.getUserProfile({ username: jo.username }))).viewer.followStatus;

describe("a follow request to a followers-only account", () => {
    it("waits for approval", async () => {
        await maya.call.users.follow({ username: jo.username });
        expect(await requesters()).toEqual([maya.username]);
        expect(await mayasStatus()).toBe("requested");
    });

    it("once denied, stays denied: withdrawing and asking again doesn't reach Jo", async () => {
        await jo.call.users.denyFollowRequest({ username: maya.username });
        expect(await requesters()).toEqual([]);
        await maya.call.users.unfollow({ username: jo.username });
        await maya.call.users.follow({ username: jo.username });
        expect(await requesters()).toEqual([]);
    });
});
