import { IonButton, IonIcon, IonItem, IonLabel, useIonActionSheet } from '@ionic/react';
import { canDeletePostComment, canUpdatePostComment } from '@myapp/shared/logic/authorization';
import { arrowDown, arrowDownOutline, arrowUp, arrowUpOutline, ellipsisHorizontal } from 'ionicons/icons';
import { UserAvatar } from '../../users/components/UserAvatar';
import { timeAgo } from '../../../common/formatters/dates';
import { displayName } from '../../../common/formatters/names';
import { usePrompts } from '../../../common/hooks/usePrompts';
import { useCommentActions } from '../hooks/useCommentActions';
import { usePostComment } from '../hooks/usePostComment';
import { useCallingUser } from '../../users/hooks/useCallingUser';
import './CommentItem.css';

/** One comment: who and when, the text, up/down votes, and a menu (edit and delete yours, report others'). */
export function CommentItem({ commentId }: { commentId: string }) {
  const comment = usePostComment(commentId);
  const { callingUser } = useCallingUser();
  const { updateComment, deleteComment, vote, reportComment } = useCommentActions();
  const { confirm, askForText, askForReport } = usePrompts();
  const [presentActionSheet] = useIonActionSheet();

  if (!comment) {
    return null;
  }
  const { creator, viewer } = comment;
  const canEdit = canUpdatePostComment(callingUser, comment).ok;
  const canDelete = canDeletePostComment(callingUser, comment).ok;
  const edited = comment.updatedAt !== comment.createdAt;

  async function edit() {
    const content = await askForText({ header: 'Edit comment', value: comment!.content, confirmText: 'Save' });
    if (content && content !== comment!.content) {
      await updateComment(comment!.id, content);
    }
  }

  async function remove() {
    const confirmed = await confirm({
      header: 'Delete this comment?',
      message: "This can't be undone.",
      confirmText: 'Delete',
    });
    if (confirmed) {
      await deleteComment(comment!);
    }
  }

  async function report() {
    const answer = await askForReport();
    if (answer) {
      await reportComment(comment!.id, answer);
    }
  }

  function openMenu() {
    void presentActionSheet({
      buttons: [
        ...(canEdit ? [{ text: 'Edit', handler: () => void edit() }] : []),
        ...(canDelete ? [{ text: 'Delete', role: 'destructive', handler: () => void remove() }] : []),
        ...(!canEdit ? [{ text: 'Report', handler: () => void report() }] : []),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
  }

  return (
    <IonItem className="comment" lines="full" data-comment-id={comment.id}>
      <UserAvatar slot="start" user={creator} size={32} />
      <IonLabel className="ion-text-wrap">
        <p className="comment__meta">
          <strong>{displayName(creator)}</strong> · <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {edited && ' · edited'}
        </p>
        <p className="comment__content">{comment.content}</p>
        <div className="comment__actions">
          <IonButton
            fill="clear"
            size="small"
            color={viewer.vote === 1 ? 'primary' : 'medium'}
            data-vote="up"
            data-voted={String(viewer.vote === 1)}
            onClick={() => void vote(comment, 1)}
          >
            <IonIcon slot="start" icon={viewer.vote === 1 ? arrowUp : arrowUpOutline} aria-hidden="true" />
            <span className="visually-hidden">{viewer.vote === 1 ? 'Remove up vote' : 'Vote up'}, </span>
            {comment.numUpVotes}
          </IonButton>
          <IonButton
            fill="clear"
            size="small"
            color={viewer.vote === -1 ? 'danger' : 'medium'}
            data-vote="down"
            data-voted={String(viewer.vote === -1)}
            onClick={() => void vote(comment, -1)}
          >
            <IonIcon slot="start" icon={viewer.vote === -1 ? arrowDown : arrowDownOutline} aria-hidden="true" />
            <span className="visually-hidden">{viewer.vote === -1 ? 'Remove down vote' : 'Vote down'}, </span>
            {comment.numDownVotes}
          </IonButton>
        </div>
      </IonLabel>
      <IonButton slot="end" fill="clear" color="medium" onClick={openMenu}>
        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
        <span className="visually-hidden">More</span>
      </IonButton>
    </IonItem>
  );
}
