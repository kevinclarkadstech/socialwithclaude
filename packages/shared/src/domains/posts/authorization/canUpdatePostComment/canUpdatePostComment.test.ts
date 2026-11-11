import { describe } from "bun:test";
import { mockPostComment } from "../../../../testing/fixtures";
import { itAllowsOnlyTheAuthor } from "../../../../testing/authorization";
import { canUpdatePostComment } from "./canUpdatePostComment";

describe("canUpdatePostComment", () => {
    itAllowsOnlyTheAuthor(canUpdatePostComment, { comment: mockPostComment() });
});
