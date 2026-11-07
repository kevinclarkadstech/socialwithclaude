import { IonButton, IonButtons, IonFooter, IonIcon, IonTextarea, IonToolbar } from '@ionic/react';
import { send } from 'ionicons/icons';
import { useState } from 'react';
import { createPostComment } from '../../actions/createPostComment';
import './CommentComposer.css';

/** Writing a comment, pinned to the bottom of the post page. */
export function CommentComposer({ postId }: { postId: string }) {
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function submit() {
    setIsBusy(true);
    try {
      const result = await createPostComment({ postId, content: content.trim() });
      if (result.ok) {
        setContent('');
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <IonFooter>
      <IonToolbar>
        <IonTextarea
          className="comment-composer__input"
          aria-label="Add a comment"
          placeholder="Add a comment"
          autoGrow
          rows={1}
          maxlength={2000}
          value={content}
          onIonInput={(event) => setContent(event.detail.value ?? '')}
        />
        <IonButtons slot="end">
          <IonButton disabled={isBusy || content.trim() === ''} onClick={() => void submit()}>
            <IonIcon slot="icon-only" icon={send} aria-hidden="true" />
            <span className="visually-hidden">Send</span>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
  );
}
