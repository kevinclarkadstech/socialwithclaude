import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReadMyNotifications } from "./canReadMyNotifications";

describe("canReadMyNotifications", () => {
    itAllowsAnyoneSignedUp(canReadMyNotifications, {});
});
