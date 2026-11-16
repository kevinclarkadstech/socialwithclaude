import { IonList, IonListHeader } from '@ionic/react';
import type { UserProfile } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { runSearchUsersQuery } from '../../operations/runSearchUsersQuery/runSearchUsersQuery';
import { UserSummaryItem } from '../UserSummaryItem/UserSummaryItem';

const LIMIT = 3;

/**
 * The few people matching `query`, above other search results (e.g. the
 * Feed's posts). Shows nothing when nobody matches or the search fails.
 */
export function PeopleSearchSection({ query }: { query: string }) {
  const [loaded, setLoaded] = useState<{ query: string; people: UserProfile[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void runSearchUsersQuery({ query, limit: LIMIT })
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setLoaded({ query, people: result?.ok ? result.value : [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Only what matches the query on screen; nothing while it loads.
  const people = loaded?.query === query ? loaded.people : [];
  if (people.length === 0) {
    return null;
  }
  return (
    <IonList data-section="people">
      <IonListHeader>People</IonListHeader>
      {people.map((person) => (
        <UserSummaryItem key={person.userId} user={person} />
      ))}
    </IonList>
  );
}
