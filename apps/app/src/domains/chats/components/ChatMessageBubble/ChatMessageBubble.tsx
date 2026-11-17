import type { ShownChatMessage } from '../../types';
import { timeAgo } from '../../../../utils/formatters/dates';
import './ChatMessageBubble.css';

/**
 * One message: yours on the right, theirs on the left. Tapping one opens its
 * menu (yours: edit, delete; theirs: report); one that failed to send offers a retry.
 */
export function ChatMessageBubble({ message, isMine, onOpenMenu, onRetry }: {
  message: ShownChatMessage;
  isMine: boolean;
  onOpenMenu?: (message: ShownChatMessage) => void;
  onRetry?: (message: ShownChatMessage) => void;
}) {
  const edited = message.updatedAt !== message.createdAt;
  const className = ['chat-message', isMine ? 'chat-message--mine' : 'chat-message--theirs', `chat-message--${message.status}`].join(' ');

  return (
    <div className={className} data-message-id={message.id} data-status={message.status}>
      {onOpenMenu && (isMine || message.status === 'sent') ? (
        <button type="button" className="chat-message__bubble" onClick={() => onOpenMenu(message)}>
          {message.content}
        </button>
      ) : (
        <div className="chat-message__bubble">{message.content}</div>
      )}
      <div className="chat-message__meta">
        {message.status === 'sending' && 'Sending…'}
        {message.status === 'failed' && (
          <button type="button" className="chat-message__retry" onClick={() => onRetry?.(message)}>
            Not sent. Tap to try again.
          </button>
        )}
        {message.status === 'sent' && (
          <>
            <time dateTime={message.createdAt}>{timeAgo(message.createdAt)}</time>
            {edited && ' · edited'}
          </>
        )}
      </div>
    </div>
  );
}
