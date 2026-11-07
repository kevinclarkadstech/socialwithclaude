import { useCallback } from 'react';
import { useEntityList } from '../../../lib/stores/useEntityList';
import { postCommentListKey, postCommentStore } from '../postCommentStore';
import { runGetPostCommentsQuery } from '../operations/runGetPostCommentsQuery';

/** A post's comments, oldest first, a page at a time. Not loaded until `enabled` (comments need sign-in to read). */
export function usePostComments(postId: string, { enabled }: { enabled: boolean }) {
  const fetchPage = useCallback(
    ({ cursor }: { cursor: string | null }) => runGetPostCommentsQuery({ postId, cursor }),
    [postId],
  );
  return useEntityList(postCommentStore, postCommentListKey(postId), fetchPage, { enabled });
}
