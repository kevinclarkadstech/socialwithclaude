import { IonButton, IonList } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import type { SuggestedPerson } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { RailCard } from '../../../../common/components/RailCard/RailCard';
import { followPerson } from '../../actions/followPerson/followPerson';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { runGetSuggestedPeopleQuery } from '../../operations/runGetSuggestedPeopleQuery/runGetSuggestedPeopleQuery';
import { UserSummaryItem } from '../UserSummaryItem/UserSummaryItem';

/** "Followed by 2 people you follow", or "Popular" for a popular account. */
function why(person: SuggestedPerson) {
  if (person.followedByCount === 0) {
    return 'Popular';
  }
  return `Followed by ${person.followedByCount} ${person.followedByCount === 1 ? 'person' : 'people'} you follow`;
}

/** "Suggested for you" in the Feed's rail: a few people to follow, with Follow. Nothing if there's nobody. */
export function SuggestedPeople() {
  const { callingUser } = useCallingUser();
  const userId = callingUser?.userId ?? null;
  const [people, setPeople] = useState<SuggestedPerson[]>([]);
  const [followed, setFollowed] = useState<Record<string, 'following' | 'requested' | 'busy'>>({});

  useEffect(() => {
    let cancelled = false;
    void runGetSuggestedPeopleQuery()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setPeople(result?.ok ? result.value : []);
          setFollowed({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function follow(person: SuggestedPerson) {
    // Signed out or mid sign-up: ask for that first (the follow itself is checked when it's made).
    const check = requireCallerWithProfile({ caller: callingUser });
    if (!check.ok) {
      disallowedActions.emit({ error: check.error });
      return;
    }
    setFollowed((current) => ({ ...current, [person.userId]: 'busy' }));
    const status = await followPerson({ username: person.username });
    setFollowed((current) => {
      const { [person.userId]: _busy, ...rest } = current;
      return status ? { ...rest, [person.userId]: status } : rest;
    });
  }

  if (people.length === 0) {
    return null;
  }
  return (
    <RailCard title="Suggested for you">
      <IonList lines="none">
        {people.map((person) => {
          const state = followed[person.userId];
          return (
            <UserSummaryItem key={person.userId} user={person} detail={why(person)}>
              <IonButton slot="end" size="small" fill={state && state !== 'busy' ? 'outline' : 'solid'} disabled={state !== undefined} onClick={() => void follow(person)}>
                {state === 'following' ? 'Following' : state === 'requested' ? 'Requested' : 'Follow'}
              </IonButton>
            </UserSummaryItem>
          );
        })}
      </IonList>
    </RailCard>
  );
}
