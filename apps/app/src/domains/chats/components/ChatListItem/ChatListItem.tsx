import { IonItem, IonLabel, IonNote } from '@ionic/react';
import type { ChatView } from '@myapp/shared/domains';
import { useNavigate } from 'react-router';
import { timeAgo } from '../../../../utils/formatters/dates';
import { useCallingUser, UserAvatar } from '../../../users';
import { chatPartnerName } from '../../utils/chatPartnerName/chatPartnerName';
import './ChatListItem.css';

/** A chat in your inbox: who it's with, the last message, when, and a dot if it's unread. */
export function ChatListItem({ chat }: { chat: ChatView }) {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();
  const { lastMessage, otherMember, viewer } = chat;
  const preview = lastMessage
    ? `${lastMessage.createdBy === callingUser?.userId ? 'You: ' : ''}${lastMessage.content}`
    : 'Message deleted';

  return (
    <IonItem
      button
      detail={false}
      // Conversations live in the Chats tab.
      onClick={() => navigate(`/chats/${chat.id}`)}
      className={viewer.hasUnread ? 'chat-list-item chat-list-item--unread' : 'chat-list-item'}
      data-chat-id={chat.id}
      data-unread={String(viewer.hasUnread)}
    >
      <UserAvatar slot="start" user={otherMember} size={48} isAvailable={!otherMember.isUnavailable} />
      <IonLabel>
        <h3>{chatPartnerName(otherMember)}</h3>
        <p>{preview}</p>
      </IonLabel>
      <div slot="end" className="chat-list-item__meta">
        {chat.lastMessageAt && (
          <IonNote>
            <time dateTime={chat.lastMessageAt}>{timeAgo(chat.lastMessageAt)}</time>
          </IonNote>
        )}
        {viewer.hasUnread && (
          <span className="chat-list-item__dot">
            <span className="visually-hidden">Unread</span>
          </span>
        )}
      </div>
    </IonItem>
  );
}
