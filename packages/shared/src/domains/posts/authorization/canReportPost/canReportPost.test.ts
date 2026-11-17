import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReportPost } from "./canReportPost";

describe("canReportPost", () => {
    itAllowsAnyoneSignedUp(canReportPost, {});
});
