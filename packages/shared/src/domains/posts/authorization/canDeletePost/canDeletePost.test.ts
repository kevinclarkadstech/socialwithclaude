import { describe } from "bun:test";
import { mockPost } from "../../../../testing/fixtures";
import { itAllowsOnlyTheAuthor } from "../../../../testing/authorization";
import { canDeletePost } from "./canDeletePost";

describe("canDeletePost", () => {
    itAllowsOnlyTheAuthor(canDeletePost, { post: mockPost() });
});
