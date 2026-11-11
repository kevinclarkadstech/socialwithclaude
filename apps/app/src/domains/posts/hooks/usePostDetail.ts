import { useEffect, useState } from 'react';
import { apiErrorCode, errorMessage } from '../../../lib/api/errors';
import { postStore } from '../postStore';
import { runGetPostByIdQuery } from '../operations/runGetPostByIdQuery';
import { usePost } from './usePost';

/**
 * A post for its own page: shown straight away if a list already loaded it,
 * and refreshed from the API either way.
 */
export function usePostDetail(postId: string) {
  const post = usePost(postId);
  const [request, setRequest] = useState<PostRequest>(() => startRequest(postId));
  // Another post starts over (set while rendering, so it never shows the last post's state).
  if (request.postId !== postId) {
    setRequest(startRequest(postId));
  }

  useEffect(() => {
    let cancelled = false;
    const finish = (change: Partial<PostRequest>) => {
      if (!cancelled) {
        setRequest((current) => (current.postId === postId ? { ...current, ...change, isLoading: false } : current));
      }
    };
    runGetPostByIdQuery({ postId })
      .then((result) => {
        if (result.ok) {
          if (!cancelled) {
            postStore.setItems([result.value.post]);
          }
          finish({});
        } else if (result.error.type === 'not-found') {
          finish({ notFound: true });
        } else {
          finish({ error: result.error.message ?? "Couldn't load this post" });
        }
      })
      .catch((caught: unknown) => {
        finish(apiErrorCode(caught) === 'NOT_FOUND' ? { notFound: true } : { error: errorMessage(caught) });
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const { isLoading, notFound, error } = request;
  return { post, isLoading: isLoading && !post, notFound: notFound || (!isLoading && !post && !error), error };
}

interface PostRequest {
  postId: string;
  isLoading: boolean;
  notFound: boolean;
  error: string | null;
}

function startRequest(postId: string): PostRequest {
  return { postId, isLoading: true, notFound: false, error: null };
}
