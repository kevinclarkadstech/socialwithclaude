import { IonList, IonListHeader } from '@ionic/react';
import type { UserProfile } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTabHref } from '../../../../navigation';
import { runSearchUsersQuery } from '../../operations/runSearchUsersQuery/runSearchUsersQuery';
import { UserPickerItem } from '../UserPickerItem/UserPickerItem';

const LIMIT = 3;

/**
 * The few people matching `query`, above other search results (e.g. the
 * Feed's posts), username first. Tapping one opens their profile in this
 * tab. Shows nothing when nobody matches or the search fails.
 */
export function PeopleSearchSection({ query }: { query: string }) {
  const navigate = useNavigate();
  const tabHref = useTabHref();
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
        <UserPickerItem key={person.userId} user={person} onSelect={() => navigate(tabHref(`profile/${person.username}`))} />
      ))}
    </IonList>
  );
}
