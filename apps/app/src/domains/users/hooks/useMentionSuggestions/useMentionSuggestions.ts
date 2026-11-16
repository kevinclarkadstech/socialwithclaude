import type { UserProfileSummary } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { runSuggestMentionsQuery } from '../../operations/runSuggestMentionsQuery/runSuggestMentionsQuery';

const DEBOUNCE_MS = 150;

/**
 * Suggestions for the mention being typed (`query`, null when there isn't
 * one), fetched once typing pauses. A reply for an older query is dropped,
 * and a failure just shows no suggestions.
 */
export function useMentionSuggestions(query: string | null): UserProfileSummary[] {
  const [loaded, setLoaded] = useState<{ query: string; suggestions: UserProfileSummary[] } | null>(null);

  useEffect(() => {
    if (query === null) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void runSuggestMentionsQuery({ query })
        .then((result) => {
          if (!cancelled) {
            setLoaded({ query, suggestions: result.ok ? result.value : [] });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLoaded({ query, suggestions: [] });
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (query === null || loaded === null) {
    return [];
  }
  // Until the new query's reply arrives, keep the last one's if it's the same mention
  // being typed or erased ("ma" → "mar"), not a different one.
  const sameMention = query.startsWith(loaded.query) || loaded.query.startsWith(query);
  return sameMention ? loaded.suggestions : [];
}
