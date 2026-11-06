import { useCallback } from 'react';
import { useEntityList } from '../../../lib/stores/useEntityList';
import { commentListKey, commentStore } from '../commentStore';
import { runGetPostCommentsQuery } from '../operations/runGetPostCommentsQuery';

/** A post's comments, oldest first, a page at a time. Not loaded until `enabled` (comments need sign-in to read). */
export function usePostComments(postId: string, { enabled }: { enabled: boolean }) {
  const fetchPage = useCallback(
    ({ cursor }: { cursor: string | null }) => runGetPostCommentsQuery({ postId, cursor }),
    [postId],
  );
  return useEntityList(commentStore, commentListKey(postId), fetchPage, { enabled });
}
