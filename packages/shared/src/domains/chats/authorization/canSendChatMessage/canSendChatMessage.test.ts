import { describe } from "bun:test";
import { itAllowsOnlyChatMembers } from "../../../../testing/authorization";
import { canSendChatMessage } from "./canSendChatMessage";

describe("canSendChatMessage", () => {
    itAllowsOnlyChatMembers(canSendChatMessage);
});
