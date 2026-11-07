import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { arrowDown, arrowDownOutline, arrowUp, arrowUpOutline, ellipsisHorizontal } from 'ionicons/icons';
import { UserAvatar } from '../../../users/components/UserAvatar/UserAvatar';
import { timeAgo } from '../../../../common/formatters/dates';
import { displayName } from '../../../../common/formatters/names';
import { setPostCommentVote } from '../../actions/setPostCommentVote';
import { nextVote } from '../../commentVotes';
import { usePostComment } from '../../hooks/usePostComment';
import { useCallingUser } from '../../../users/hooks/useCallingUser';
import { openCommentMenu } from './openCommentMenu';
import './CommentItem.css';

/** One comment: who and when, the text, up/down votes, and a menu (edit and delete yours, report others'). */
export function CommentItem({ commentId }: { commentId: string }) {
  const comment = usePostComment(commentId);
  const { callingUser } = useCallingUser();

  if (!comment) {
    return null;
  }
  const { id, creator, viewer } = comment;
  const edited = comment.updatedAt !== comment.createdAt;

  /** Tapping the vote you already gave removes it; otherwise it becomes your vote. */
  function vote(tapped: 1 | -1) {
    void setPostCommentVote({ postCommentId: id, value: nextVote(viewer.vote, tapped) });
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
            onClick={() => vote(1)}
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
            onClick={() => vote(-1)}
          >
            <IonIcon slot="start" icon={viewer.vote === -1 ? arrowDown : arrowDownOutline} aria-hidden="true" />
            <span className="visually-hidden">{viewer.vote === -1 ? 'Remove down vote' : 'Vote down'}, </span>
            {comment.numDownVotes}
          </IonButton>
        </div>
      </IonLabel>
      <IonButton slot="end" fill="clear" color="medium" onClick={() => void openCommentMenu({ comment, callingUser })}>
        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
        <span className="visually-hidden">More</span>
      </IonButton>
    </IonItem>
  );
}
