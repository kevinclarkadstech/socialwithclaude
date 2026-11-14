import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canDenyFollowRequest } from "./canDenyFollowRequest";

describe("canDenyFollowRequest", () => {
    itAllowsAnyoneSignedUp(canDenyFollowRequest, {});
});
