import { IonButton, IonList } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { RailCard } from '../../../../common/components/RailCard/RailCard';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runGetUserProfileQuery, useCallingUser, UserSummaryItem } from '../../../users';
import { runGetChatSuggestionsQuery } from '../../operations/runGetChatSuggestionsQuery/runGetChatSuggestionsQuery';
import { runGetOrCreateDirectChatMutation } from '../../operations/runGetOrCreateDirectChatMutation/runGetOrCreateDirectChatMutation';

/** "Start a chat" in Chats' rail: people you follow but haven't messaged, with Message. Signed-up only; nothing if there's nobody. */
export function ChatSuggestions() {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();
  const signedUp = requireCallerWithProfile({ caller: callingUser }).ok;
  const userId = callingUser?.userId ?? null;
  const [people, setPeople] = useState<UserProfileSummary[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!signedUp) {
      return;
    }
    let cancelled = false;
    void runGetChatSuggestionsQuery()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setPeople(result?.ok ? result.value : []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [signedUp, userId]);

  async function message(person: UserProfileSummary) {
    setOpening(person.userId);
    const loaded = await runOrToast(() => runGetUserProfileQuery({ username: person.username }));
    const chat = loaded.ok ? await runOrToast(() => runGetOrCreateDirectChatMutation({ receiver: loaded.value })) : null;
    setOpening(null);
    if (chat?.ok) {
      navigate(`/chats/${chat.value.id}`);
    }
  }

  if (!signedUp || people.length === 0) {
    return null;
  }
  return (
    <RailCard title="Start a chat">
      <IonList lines="none">
        {people.map((person) => (
          <UserSummaryItem key={person.userId} user={person}>
            <IonButton slot="end" size="small" fill="outline" disabled={opening === person.userId} onClick={() => void message(person)}>
              Message
            </IonButton>
          </UserSummaryItem>
        ))}
      </IonList>
    </RailCard>
  );
}
