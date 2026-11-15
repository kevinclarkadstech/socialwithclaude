import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnsavePostComment } from "./canUnsavePostComment";

describe("canUnsavePostComment", () => {
    itAllowsAnyoneSignedUp(canUnsavePostComment, {});
});
