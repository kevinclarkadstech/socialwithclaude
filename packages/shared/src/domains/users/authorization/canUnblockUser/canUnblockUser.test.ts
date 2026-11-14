import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnblockUser } from "./canUnblockUser";

describe("canUnblockUser", () => {
    itAllowsAnyoneSignedUp(canUnblockUser, {});
});
