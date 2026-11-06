import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { Post } from '@myapp/shared/domains';
import { useState } from 'react';
import { usePostActions } from '../../domains/posts/hooks/usePostActions';

const MAX_LENGTH = 2000;

interface ComposePostModalProps {
  isOpen: boolean;
  /** The post being edited; without one, a new post. */
  post?: Post;
  onDismiss: () => void;
}

/** Writing a new post, or editing one of yours. */
export function ComposePostModal({ isOpen, post, onDismiss }: ComposePostModalProps) {
  const { createPost, updatePost } = usePostActions();
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const trimmed = content.trim();

  async function submit() {
    setIsBusy(true);
    try {
      const done = post ? await updatePost(post.id, trimmed) : await createPost(trimmed);
      if (done) {
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={() => setContent(post?.content ?? '')} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{post ? 'Edit post' : 'New post'}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={isBusy || !trimmed || trimmed === post?.content}
              onClick={() => void submit()}
            >
              {post ? 'Save' : 'Post'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonTextarea
          aria-label="What's on your mind?"
          placeholder="What's on your mind?"
          autoGrow
          autofocus
          counter
          maxlength={MAX_LENGTH}
          rows={4}
          value={content}
          onIonInput={(event) => setContent(event.detail.value ?? '')}
        />
      </IonContent>
    </IonModal>
  );
}
