import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnfollowUser } from "./canUnfollowUser";

describe("canUnfollowUser", () => {
    itAllowsAnyoneSignedUp(canUnfollowUser, {});
});
