import { describe, expect, it } from "bun:test";
import { mockCaller, mockPost, mockPostComment, userId2 } from "../../../testing/fixtures";
import {
    canCommentOnPost,
    canDeletePost,
    canDeletePostComment,
    canReportPost,
    canReportPostComment,
    canUpdatePost,
    canUpdatePostComment,
    canVoteOnPostComment,
} from ".";

const signedOut = null;
const midSignUp = mockCaller({ profile: null });
const author = mockCaller();
const someoneElse = mockCaller({ userId: userId2 });

describe.each([
    ["canUpdatePost", canUpdatePost, mockPost()],
    ["canDeletePost", canDeletePost, mockPost()],
    ["canUpdatePostComment", canUpdatePostComment, mockPostComment()],
    ["canDeletePostComment", canDeletePostComment, mockPostComment()],
] as const)("%s", (_name, can, resource) => {
    it("allows the author", () => {
        expect(can(author, resource as never)).toMatchObject({ ok: true, value: { userId: author.userId } });
    });
    it("refuses someone else", () => {
        expect(can(someoneElse, resource as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user", () => {
        expect(can(signedOut, resource as never)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
    it("needs sign-up to be finished", () => {
        expect(can(midSignUp, resource as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe.each([
    ["canReportPost", canReportPost, mockPost()],
    ["canCommentOnPost", canCommentOnPost, mockPost()],
    ["canVoteOnPostComment", canVoteOnPostComment, mockPostComment()],
    ["canReportPostComment", canReportPostComment, mockPostComment()],
] as const)("%s", (_name, can, resource) => {
    it("allows anyone who finished sign-up, author or not", () => {
        expect(can(author, resource as never).ok).toBe(true);
        expect(can(someoneElse, resource as never).ok).toBe(true);
    });
    it("needs a signed-in user", () => {
        expect(can(signedOut, resource as never)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
    it("needs sign-up to be finished", () => {
        expect(can(midSignUp, resource as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
