import { describe } from "bun:test";
import { itAllowsOnlyTheSender } from "../../../../testing/authorization";
import { canDeleteChatMessage } from "./canDeleteChatMessage";

describe("canDeleteChatMessage", () => {
    itAllowsOnlyTheSender(canDeleteChatMessage);
});
