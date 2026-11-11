import { describe } from "bun:test";
import { mockPost } from "../../../../testing/fixtures";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canReportPost } from "./canReportPost";

describe("canReportPost", () => {
    itAllowsAnyoneSignedUp(canReportPost, { post: mockPost() });
});
