import { describe } from "bun:test";
import { itAllowsOnlySomeoneElse } from "../../../../testing/authorization";
import { canBlockUser } from "./canBlockUser";

describe("canBlockUser", () => {
    itAllowsOnlySomeoneElse(canBlockUser);
});
