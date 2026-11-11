import { describe } from "bun:test";
import { mockPost } from "../../../../testing/fixtures";
import { itAllowsOnlyTheAuthor } from "../../../../testing/authorization";
import { canUpdatePost } from "./canUpdatePost";

describe("canUpdatePost", () => {
    itAllowsOnlyTheAuthor(canUpdatePost, { post: mockPost() });
});
