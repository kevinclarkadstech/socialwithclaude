import type { PostCommentView, PostCommentVoteValue } from '@myapp/shared/domains';

/** What tapping a vote button does: tapping the vote you already gave removes it. */
export function nextVote(current: PostCommentVoteValue | null, tapped: PostCommentVoteValue): PostCommentVoteValue | null {
  return current === tapped ? null : tapped;
}

/** The comment with `next` as the viewer's vote, and its up/down counts changed to match. */
export function withVote(comment: PostCommentView, next: PostCommentVoteValue | null): PostCommentView {
  const previous = comment.viewer.vote;
  const change = (value: PostCommentVoteValue) => (next === value ? 1 : 0) - (previous === value ? 1 : 0);
  return {
    ...comment,
    numUpVotes: comment.numUpVotes + change(1),
    numDownVotes: comment.numDownVotes + change(-1),
    viewer: { ...comment.viewer, vote: next },
  };
}
