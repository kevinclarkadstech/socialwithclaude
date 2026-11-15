import { describe } from "bun:test";
import { itAllowsOnlyChatMembers } from "../../../../testing/authorization";
import { canSaveChatMessage } from "./canSaveChatMessage";

describe("canSaveChatMessage", () => {
    itAllowsOnlyChatMembers(canSaveChatMessage);
});
