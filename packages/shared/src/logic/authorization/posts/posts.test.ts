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
    ["canUpdatePost", canUpdatePost, { post: mockPost() }],
    ["canDeletePost", canDeletePost, { post: mockPost() }],
    ["canUpdatePostComment", canUpdatePostComment, { comment: mockPostComment() }],
    ["canDeletePostComment", canDeletePostComment, { comment: mockPostComment() }],
] as const)("%s", (_name, can, context) => {
    it("allows the author", () => {
        expect(can({ caller: author, ...context } as never)).toMatchObject({ ok: true, value: { userId: author.userId } });
    });
    it("refuses someone else", () => {
        expect(can({ caller: someoneElse, ...context } as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, ...context } as never)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
    it("needs sign-up to be finished", () => {
        expect(can({ caller: midSignUp, ...context } as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe.each([
    ["canReportPost", canReportPost, { post: mockPost() }],
    ["canCommentOnPost", canCommentOnPost, { post: mockPost() }],
    ["canVoteOnPostComment", canVoteOnPostComment, { comment: mockPostComment() }],
    ["canReportPostComment", canReportPostComment, { comment: mockPostComment() }],
] as const)("%s", (_name, can, context) => {
    it("allows anyone who finished sign-up, author or not", () => {
        expect(can({ caller: author, ...context } as never).ok).toBe(true);
        expect(can({ caller: someoneElse, ...context } as never).ok).toBe(true);
    });
    it("needs a signed-in user", () => {
        expect(can({ caller: signedOut, ...context } as never)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
    it("needs sign-up to be finished", () => {
        expect(can({ caller: midSignUp, ...context } as never)).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});
