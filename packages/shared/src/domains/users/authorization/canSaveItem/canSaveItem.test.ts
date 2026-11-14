import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canSaveItem } from "./canSaveItem";

describe("canSaveItem", () => {
    itAllowsAnyoneSignedUp(canSaveItem, {});
});
