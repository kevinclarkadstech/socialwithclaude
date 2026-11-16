import { IonButton, IonButtons, IonFooter, IonIcon, IonToolbar } from '@ionic/react';
import { send } from 'ionicons/icons';
import { useState } from 'react';
import { MentionTextarea } from '../../../users';
import './ChatComposer.css';

/** Writing a message, pinned to the bottom of the chat. Enter sends; Shift+Enter starts a new line. */
export function ChatComposer({ onSend }: { onSend: (content: string) => void }) {
  const [content, setContent] = useState('');
  const trimmed = content.trim();

  function submit() {
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setContent('');
  }

  return (
    <IonFooter>
      <IonToolbar>
        <MentionTextarea
          suggestionsPlacement="above"
          className="chat-composer__input"
          aria-label="Message"
          placeholder="Message"
          autoGrow
          rows={1}
          maxlength={2000}
          value={content}
          onValueChange={setContent}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <IonButtons slot="end">
          <IonButton disabled={!trimmed} onClick={submit}>
            <IonIcon slot="icon-only" icon={send} aria-hidden="true" />
            <span className="visually-hidden">Send</span>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
  );
}
