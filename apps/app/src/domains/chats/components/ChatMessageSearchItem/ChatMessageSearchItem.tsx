import { IonItem, IonLabel, IonNote } from '@ionic/react';
import type { ChatMessageSearchResult } from '@myapp/shared/domains';
import { useNavigate } from 'react-router';
import { timeAgo } from '../../../../utils/formatters/dates';
import { displayName } from '../../../../utils/formatters/names';
import { useCallingUser, UserAvatar } from '../../../users';

/** A message found by searching your chats: who the chat is with, the message, and when. Opens the chat. */
export function ChatMessageSearchItem({ result }: { result: ChatMessageSearchResult }) {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();
  const { message, otherMember } = result;
  const fromYou = message.createdBy === callingUser?.userId;

  return (
    <IonItem button detail={false} onClick={() => navigate(`/chats/${message.chatId}`)} data-message-id={message.id}>
      <UserAvatar slot="start" user={otherMember} size={48} />
      <IonLabel>
        <h3>{displayName(otherMember)}</h3>
        <p>{fromYou ? `You: ${message.content}` : message.content}</p>
      </IonLabel>
      <IonNote slot="end">
        <time dateTime={message.createdAt}>{timeAgo(message.createdAt)}</time>
      </IonNote>
    </IonItem>
  );
}
