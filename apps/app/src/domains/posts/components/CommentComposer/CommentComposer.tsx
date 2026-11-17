import { IonButton, IonButtons, IonFooter, IonIcon, IonSpinner, IonToolbar } from '@ionic/react';
import { closeCircle, imageOutline, send } from 'ionicons/icons';
import { useState } from 'react';
import { errorMessage } from '../../../../lib/api/errors';
import { newId } from '../../../../lib/ids';
import { pickPhotoFile } from '../../../../lib/photos/pickPhotoFile';
import { showErrorToast } from '../../../../lib/toasts';
import { MentionTextarea } from '../../../users';
import { createPostComment } from '../../actions/createPostComment/createPostComment';
import { uploadCommentPhoto } from '../../actions/uploadCommentPhoto/uploadCommentPhoto';
import { preparePostPhoto, type PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';
import './CommentComposer.css';

type PhotoState = { status: 'uploading' | 'ready'; photo: PreparedPostPhoto } | null;

/**
 * Writing a comment, pinned to the bottom of the post page: text, a photo,
 * or both. A picked photo is resized and uploaded straight away, under the
 * comment's id (made now), and published when it's sent.
 */
export function CommentComposer({ postId }: { postId: string }) {
  const [commentId, setCommentId] = useState(newId);
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState<PhotoState>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function addPhoto() {
    const file = await pickPhotoFile();
    if (!file) {
      return;
    }
    try {
      const prepared = await preparePostPhoto(file);
      setPhoto({ status: 'uploading', photo: prepared });
      const uploaded = await uploadCommentPhoto({ postId, postCommentId: commentId, photo: prepared });
      if (!uploaded.ok) {
        throw new Error(uploaded.error.message ?? "That photo didn't upload");
      }
      setPhoto({ status: 'ready', photo: prepared });
    } catch (error) {
      setPhoto(null);
      void showErrorToast(errorMessage(error));
    }
  }

  async function submit() {
    setIsBusy(true);
    try {
      const result = await createPostComment({ id: commentId, postId, content: content.trim(), photo: photo?.photo ?? null });
      if (result.ok) {
        setContent('');
        setPhoto(null);
        setCommentId(newId());
      }
    } finally {
      setIsBusy(false);
    }
  }

  const canSend = !isBusy && photo?.status !== 'uploading' && (content.trim() !== '' || photo?.status === 'ready');

  return (
    <IonFooter>
      {photo && (
        <div className="comment-composer__photo" data-status={photo.status}>
          <img src={photo.photo.previewUrl} alt="" />
          {photo.status === 'uploading' && <IonSpinner className="comment-composer__photo-spinner" />}
          <button type="button" className="comment-composer__photo-remove" onClick={() => setPhoto(null)}>
            <IonIcon icon={closeCircle} aria-hidden="true" />
            <span className="visually-hidden">Remove photo</span>
          </button>
        </div>
      )}
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton disabled={isBusy || photo !== null} onClick={() => void addPhoto()}>
            <IonIcon slot="icon-only" icon={imageOutline} aria-hidden="true" />
            <span className="visually-hidden">Add a photo</span>
          </IonButton>
        </IonButtons>
        <MentionTextarea
          suggestionsPlacement="above"
          className="comment-composer__input"
          aria-label="Add a comment"
          placeholder="Add a comment"
          autoGrow
          rows={1}
          maxlength={2000}
          value={content}
          onValueChange={setContent}
        />
        <IonButtons slot="end">
          <IonButton disabled={!canSend} onClick={() => void submit()}>
            <IonIcon slot="icon-only" icon={send} aria-hidden="true" />
            <span className="visually-hidden">Send</span>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
  );
}
