import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canAcceptFollowRequest } from "./canAcceptFollowRequest";

describe("canAcceptFollowRequest", () => {
    itAllowsAnyoneSignedUp(canAcceptFollowRequest, {});
});
