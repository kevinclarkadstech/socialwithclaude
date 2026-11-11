import { describe } from "bun:test";
import { itAllowsOnlyTheSender } from "../../../../testing/authorization";
import { canUpdateChatMessage } from "./canUpdateChatMessage";

describe("canUpdateChatMessage", () => {
    itAllowsOnlyTheSender(canUpdateChatMessage);
});
