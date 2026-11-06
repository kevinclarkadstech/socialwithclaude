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
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    runGetPostByIdQuery({ postId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          postStore.setItems([result.value.post]);
        } else if (result.error.type === 'not-found') {
          setNotFound(true);
        } else {
          setError(result.error.message ?? "Couldn't load this post");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          if (apiErrorCode(caught) === 'NOT_FOUND') {
            setNotFound(true);
          } else {
            setError(errorMessage(caught));
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return { post, isLoading: isLoading && !post, notFound: notFound || (!isLoading && !post && !error), error };
}
