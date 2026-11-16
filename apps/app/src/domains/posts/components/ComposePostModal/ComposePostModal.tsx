import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { PostView } from '@myapp/shared/domains';
import { MentionTextarea } from '../../../users';
import { useComposePost } from '../../hooks/useComposePost/useComposePost';
import { PostPhotosField } from '../PostPhotosField/PostPhotosField';
import './ComposePostModal.css';

const MAX_LENGTH = 2000;

interface ComposePostModalProps {
  isOpen: boolean;
  /** The post being edited; without one, a new post. */
  post?: PostView;
  onDismiss: () => void;
}

/** Writing a new post (text, photos or both), or editing one of yours. */
export function ComposePostModal({ isOpen, post, onDismiss }: ComposePostModalProps) {
  const { content, setContent, photos, isBusy, canSubmit, reset, submit } = useComposePost({ post, onDismiss });

  return (
    <IonModal isOpen={isOpen} onWillPresent={reset} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{post ? 'Edit post' : 'New post'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={!canSubmit} onClick={() => void submit()}>
              {isBusy ? <IonSpinner name="dots" aria-label="Saving" /> : post ? 'Save' : 'Post'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <MentionTextarea
          suggestionsPlacement="below"
          aria-label="What's on your mind?"
          placeholder="What's on your mind?"
          autoGrow
          autofocus
          counter
          maxlength={MAX_LENGTH}
          rows={4}
          value={content}
          onValueChange={setContent}
        />
        <div className="compose-post__photos">
          <PostPhotosField photos={photos} />
        </div>
      </IonContent>
    </IonModal>
  );
}
