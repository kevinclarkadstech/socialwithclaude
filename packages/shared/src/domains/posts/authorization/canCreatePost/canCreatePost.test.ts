import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canCreatePost } from "./canCreatePost";

describe("canCreatePost", () => {
    itAllowsAnyoneSignedUp(canCreatePost, {});
});
