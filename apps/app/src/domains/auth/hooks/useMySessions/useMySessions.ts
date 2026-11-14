import type { GetMySessionsQueryOutput } from '@myapp/shared/domains';
import { useCallback, useEffect, useState } from 'react';
import type { Result } from '@myapp/shared/types';
import { runGetMySessionsQuery } from '../../operations/runGetMySessionsQuery/runGetMySessionsQuery';

/** Where you're signed in, this device first. */
export function useMySessions() {
  const [sessions, setSessions] = useState<GetMySessionsQueryOutput | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  const apply = useCallback((result: Result<GetMySessionsQueryOutput> | null) => {
    if (!result?.ok) {
      setIsFailed(true);
      return;
    }
    // This device first, then most recently active.
    setSessions([...result.value].sort((a, b) => Number(b.current) - Number(a.current)));
    setIsFailed(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void runGetMySessionsQuery()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          apply(result);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  async function reload() {
    apply(await runGetMySessionsQuery().catch(() => null));
  }

  return { sessions, isFailed, reload };
}
