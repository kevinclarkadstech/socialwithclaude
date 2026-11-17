import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReportPostComment } from "./canReportPostComment";

describe("canReportPostComment", () => {
    itAllowsAnyoneSignedUp(canReportPostComment, {});
});
