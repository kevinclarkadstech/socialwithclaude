import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUpdateMyProfile } from "./canUpdateMyProfile";

describe("canUpdateMyProfile", () => {
    itAllowsAnyoneSignedUp(canUpdateMyProfile, {});
});
