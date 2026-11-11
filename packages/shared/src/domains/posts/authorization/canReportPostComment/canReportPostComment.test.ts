import { describe } from "bun:test";
import { mockPostComment } from "../../../../testing/fixtures";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReportPostComment } from "./canReportPostComment";

describe("canReportPostComment", () => {
    itAllowsAnyoneSignedUp(canReportPostComment, { comment: mockPostComment() });
});
