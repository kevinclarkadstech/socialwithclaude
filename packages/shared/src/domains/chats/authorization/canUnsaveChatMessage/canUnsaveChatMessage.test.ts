import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnsaveChatMessage } from "./canUnsaveChatMessage";

describe("canUnsaveChatMessage", () => {
    itAllowsAnyoneSignedUp(canUnsaveChatMessage, {});
});
