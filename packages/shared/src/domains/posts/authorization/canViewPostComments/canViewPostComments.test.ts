import { describe } from "bun:test";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { mockPost } from "../../../../testing/fixtures";
import { canViewPostComments } from "./canViewPostComments";

describe("canViewPostComments", () => {
    itAllowsAnyoneSignedUp(canViewPostComments, { post: mockPost() });
});
