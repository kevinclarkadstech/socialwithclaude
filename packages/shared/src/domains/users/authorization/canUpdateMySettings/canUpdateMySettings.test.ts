import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canUpdateMySettings } from "./canUpdateMySettings";

describe("canUpdateMySettings", () => {
    itAllowsAnyoneSignedUp(canUpdateMySettings, {});
});
