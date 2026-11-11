import { describe } from "bun:test";
import { mockPostComment } from "../../../../testing/fixtures";
import { itAllowsOnlyTheAuthor } from "../../../../testing/authorization";
import { canDeletePostComment } from "./canDeletePostComment";

describe("canDeletePostComment", () => {
    itAllowsOnlyTheAuthor(canDeletePostComment, { comment: mockPostComment() });
});
