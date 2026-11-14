import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUnsaveItem } from "./canUnsaveItem";

describe("canUnsaveItem", () => {
    itAllowsAnyoneSignedUp(canUnsaveItem, {});
});
