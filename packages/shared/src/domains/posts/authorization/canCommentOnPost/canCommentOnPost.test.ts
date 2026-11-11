import { describe } from "bun:test";
import { mockPost } from "../../../../testing/fixtures";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canCommentOnPost } from "./canCommentOnPost";

describe("canCommentOnPost", () => {
    itAllowsAnyoneSignedUp(canCommentOnPost, { post: mockPost() });
});
