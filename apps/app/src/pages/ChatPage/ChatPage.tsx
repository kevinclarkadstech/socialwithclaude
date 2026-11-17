import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { canDeleteChatMessage, canReportChatMessage, canSendChatMessage, canUpdateChatMessage, canViewChat } from '@myapp/shared/domains';
import { ellipsisHorizontal } from 'ionicons/icons';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import {
  ChatComposer,
  ChatMessageBubble,
  chatMembers,
  reportChatMessage,
  runClearChatMutation,
  useChat,
  useChatMessages,
  type ShownChatMessage,
} from '../../domains/chats';
import { useCallingUser, UserAvatar } from '../../domains/users';
import { runOrToast } from '../../lib/api/runOrToast';
import { askForText, chooseFrom, confirm } from '../../lib/prompts';
import { BackButton, usePageContext, useTabHref, useTabNavigation } from '../../navigation';
import { displayName } from '../../utils/formatters/names';
import '../../common/styles/pages.css';
import './ChatPage.css';

/** Sending is refused because one of you blocked the other. */
function isBlock(reason: unknown) {
  return reason === 'blocked-by-user' || reason === 'blocking-user';
}

/** A conversation (/chats/:chatId): the messages, newest at the bottom, and the message box. */
export function ChatPage() {
  const { chatId = '' } = useParams();
  const { callingUser } = useCallingUser();
  const { chat, status } = useChat(chatId);
  const { isVisible } = usePageContext();
  const messages = useChatMessages(chat, { isShown: isVisible });
  const { goBack } = useTabNavigation();
  const tabHref = useTabHref();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const members = chat ? chatMembers(chat) : [];
  // Who "@" suggests while writing: the other member (memoized so the composer's matching isn't redone every render).
  const otherMember = chat?.otherMember;
  const mentionCandidates = useMemo(() => (otherMember ? [otherMember] : []), [otherMember]);
  const sendCheck = canSendChatMessage({ caller: callingUser, members });
  const clearCheck = canViewChat({ caller: callingUser, members });

  // The newest message in view: on opening, when you send one, and when one
  // arrives while you're at the bottom (not while you're reading older ones).
  const newest = messages.messages.at(-1);
  const newestId = newest?.id;
  const newestIsMine = newest?.createdBy === callingUser?.userId;
  const hasScrolled = useRef(false);
  useEffect(() => {
    if (!newestId) {
      return;
    }
    const content = contentRef.current;
    if (!content) {
      return;
    }
    void content.getScrollElement().then((scroller) => {
      const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 150;
      const isFirst = !hasScrolled.current;
      if (isFirst || newestIsMine || nearBottom) {
        hasScrolled.current = true;
        // Straight there on opening; a short glide for a new message.
        void content.scrollToBottom(isFirst ? 0 : 200);
      }
    });
  }, [newestId, newestIsMine]);

  function send(content: string) {
    if (!sendCheck.ok) {
      disallowedActions.emit({ error: sendCheck.error, action: () => messages.send(content) });
      return;
    }
    messages.send(content);
  }

  async function openMessageMenu(message: ShownChatMessage) {
    const updateCheck = canUpdateChatMessage({ caller: callingUser, message });
    const deleteCheck = canDeleteChatMessage({ caller: callingUser, message });
    const reportCheck = canReportChatMessage({ caller: callingUser, members, message });
    const choice = await chooseFrom({
      options: [
        ...(updateCheck.ok && message.status === 'sent' ? [{ text: 'Edit', value: 'edit' as const }] : []),
        ...(deleteCheck.ok ? [{ text: 'Delete', value: 'delete' as const, role: 'destructive' as const }] : []),
        ...(reportCheck.ok && message.status === 'sent' ? [{ text: 'Report', value: 'report' as const, role: 'destructive' as const }] : []),
      ],
    });
    if (choice === 'report') {
      await reportChatMessage({ message, members });
    }
    if (choice === 'edit') {
      const content = await askForText({ header: 'Edit message', value: message.content, confirmText: 'Save' });
      if (content?.trim() && content.trim() !== message.content) {
        await messages.edit(message, content.trim());
      }
    }
    if (choice === 'delete') {
      const confirmed = await confirm({
        header: 'Delete this message?',
        message: "It'll be removed for both of you.",
        confirmText: 'Delete',
      });
      if (confirmed) {
        await messages.remove(message);
      }
    }
  }

  async function openChatMenu() {
    if (!chat) {
      return;
    }
    if (!clearCheck.ok) {
      disallowedActions.emit({ error: clearCheck.error });
      return;
    }
    const choice = await chooseFrom({ options: [{ text: 'Delete chat', value: 'clear' as const, role: 'destructive' as const }] });
    if (choice !== 'clear') {
      return;
    }
    const confirmed = await confirm({
      header: 'Delete this chat?',
      message: `Its messages so far are deleted for you. ${displayName(chat.otherMember)} still has them.`,
      confirmText: 'Delete',
    });
    if (!confirmed) {
      return;
    }
    const result = await runOrToast(() => runClearChatMutation({ chat }));
    if (result.ok) {
      goBack();
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>
            {chat ? (
              <a
                className="chat-page__title"
                href={tabHref(`profile/${chat.otherMember.username}`)}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(tabHref(`profile/${chat.otherMember.username}`));
                }}
              >
                <UserAvatar user={chat.otherMember} size={32} />
                <span>{displayName(chat.otherMember)}</span>
              </a>
            ) : (
              'Chat'
            )}
          </IonTitle>
          {chat && (
            <IonButtons slot="end">
              <IonButton onClick={() => void openChatMenu()}>
                <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
                <span className="visually-hidden">More</span>
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent ref={contentRef}>
        <IonRefresher slot="fixed" onIonRefresh={(event) => void messages.refresh().finally(() => event.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        {(status === 'loading' || (status === 'ready' && messages.status === 'loading')) && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {status === 'not-found' && <p className="page-message">This chat doesn't exist, or you're not in it.</p>}
        {(status === 'failed' || messages.status === 'failed') && (
          <p className="page-message">Couldn't load this chat. Pull down to try again.</p>
        )}

        {chat && messages.status === 'ready' && (
          <div className="chat-page__messages">
            {messages.hasOlder && (
              <IonButton fill="clear" size="small" disabled={messages.isLoadingOlder} onClick={() => void messages.loadOlder()}>
                Load earlier messages
              </IonButton>
            )}
            {messages.messages.length === 0 && (
              <p className="page-message">Say hi to {displayName(chat.otherMember)}.</p>
            )}
            {messages.messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isMine={message.createdBy === callingUser?.userId}
                onOpenMenu={(shown) => void openMessageMenu(shown)}
                onRetry={messages.retry}
              />
            ))}
          </div>
        )}
      </IonContent>
      {chat && sendCheck.ok && <ChatComposer members={mentionCandidates} onSend={send} />}
      {chat && !sendCheck.ok && isBlock(sendCheck.error.metadata?.reason) && (
        <IonFooter>
          <IonToolbar>
            <p className="chat-page__blocked">{sendCheck.error.message}</p>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
}
