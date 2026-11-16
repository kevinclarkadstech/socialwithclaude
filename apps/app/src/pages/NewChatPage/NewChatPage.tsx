import { canCreateDirectChat, type UserProfile } from '@myapp/shared/domains';
import type { Page, Result } from '@myapp/shared/types';
import { useNavigate } from 'react-router';
import { SearchPage } from '../../common/components/SearchPage/SearchPage';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { runGetOrCreateDirectChatMutation } from '../../domains/chats';
import { callingUserStore, runSearchUsersQuery, UserPickerItem, useCallingUser } from '../../domains/users';
import { runOrToast } from '../../lib/api/runOrToast';
import type { SearchFn } from '../../lib/api/useSearchResults';

/** People to message: anyone matching but yourself, as one page. */
const searchPeople: SearchFn<UserProfile> = async ({ query }): Promise<Result<Page<UserProfile>>> => {
  const result = await runSearchUsersQuery({ query, limit: 20 });
  if (!result.ok) {
    return result;
  }
  const me = callingUserStore.get().callingUser?.userId;
  return { ok: true, value: { items: result.value.filter((person) => person.userId !== me), nextCursor: null } };
};

/** Starting a chat: find someone by name or username, then open your chat with them (or a new one). */
export function NewChatPage() {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();

  function message(receiver: UserProfile) {
    const action = async () => {
      const result = await runOrToast(() => runGetOrCreateDirectChatMutation({ receiver }));
      if (result.ok) {
        navigate(`/chats/${result.value.id}`);
      }
    };
    const check = canCreateDirectChat({ caller: callingUser, receiver });
    if (!check.ok) {
      disallowedActions.emit({ error: check.error, action: () => void action() });
      return;
    }
    void action();
  }

  return (
    <SearchPage
      placeholder="Search people"
      search={searchPeople}
      getKey={(person) => person.userId}
      renderItem={(person) => <UserPickerItem user={person} onSelect={() => message(person)} />}
      hint="Find someone to message by name or username."
      emptyText={(query) => `Nobody matches "${query}".`}
    />
  );
}
