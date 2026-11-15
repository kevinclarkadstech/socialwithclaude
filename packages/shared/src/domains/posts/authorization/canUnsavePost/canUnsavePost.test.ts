import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnsavePost } from "./canUnsavePost";

describe("canUnsavePost", () => {
    itAllowsAnyoneSignedUp(canUnsavePost, {});
});
