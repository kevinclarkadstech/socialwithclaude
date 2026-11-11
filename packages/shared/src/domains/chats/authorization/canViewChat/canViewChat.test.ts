import { describe } from "bun:test";
import { itAllowsOnlyChatMembers } from "../../../../testing/authorization";
import { canViewChat } from "./canViewChat";

describe("canViewChat", () => {
    itAllowsOnlyChatMembers(canViewChat);
});
