import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canSendFeedback } from "./canSendFeedback";

describe("canSendFeedback", () => {
    itAllowsAnyoneSignedUp(canSendFeedback, {});
});
