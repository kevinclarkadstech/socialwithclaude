import { describe } from "bun:test";
import { mockPostComment } from "../../../../testing/fixtures";
import { itAllowsAnyoneSignedUp } from "../../../../testing/authorization";
import { canVoteOnPostComment } from "./canVoteOnPostComment";

describe("canVoteOnPostComment", () => {
    itAllowsAnyoneSignedUp(canVoteOnPostComment, { comment: mockPostComment() });
});
