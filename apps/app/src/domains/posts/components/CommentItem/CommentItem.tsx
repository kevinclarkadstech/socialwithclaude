import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { canVoteOnPostComment } from '@myapp/shared/domains';
import { arrowDown, arrowDownOutline, arrowUp, arrowUpOutline, ellipsisHorizontal } from 'ionicons/icons';
import { useCallingUser, UserAvatar } from '../../../users';
import { timeAgo } from '../../../../utils/formatters/dates';
import { displayName } from '../../../../utils/formatters/names';
import { setPostCommentVote } from '../../actions/setPostCommentVote/setPostCommentVote';
import { nextVote } from '../../commentVotes';
import { usePost } from '../../hooks/usePost/usePost';
import { usePostComment } from '../../hooks/usePostComment/usePostComment';
import { AuthorLink } from '../AuthorLink/AuthorLink';
import { openCommentMenu } from './openCommentMenu';
import { openPhotoViewer } from '../../../../common/components/PhotoViewer/photoViewerStore';
import { commentPhotoDisplay } from '../../utils/commentPhotoDisplay/commentPhotoDisplay';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import './CommentItem.css';

/**
 * One comment: who and when, the text, its photo (tap for full screen), up/down
 * votes, and a menu (edit, change its photo and delete yours; report others').
 */
export function CommentItem({ commentId }: { commentId: string }) {
  const comment = usePostComment(commentId);
  // Comments show on their post's page, so the post is in the store.
  const post = usePost(comment?.postId ?? '');
  const { callingUser } = useCallingUser();

  if (!comment || !post) {
    return null;
  }
  const { id, creator, viewer } = comment;
  const edited = comment.updatedAt !== comment.createdAt;
  const voteCheck = canVoteOnPostComment({ caller: callingUser, post, comment });

  /** Tapping the vote you already gave removes it; otherwise it becomes your vote. */
  function vote(tapped: 1 | -1) {
    const action = () => void setPostCommentVote({ postCommentId: id, value: nextVote(viewer.vote, tapped) });
    if (!voteCheck.ok) {
      disallowedActions.emit({ error: voteCheck.error, action });
      return;
    }
    action();
  }

  return (
    <IonItem className="comment" lines="full" data-comment-id={comment.id}>
      <AuthorLink slot="start" username={creator.username}>
        <UserAvatar user={creator} size={32} />
      </AuthorLink>
      <IonLabel className="ion-text-wrap">
        <p className="comment__meta">
          <AuthorLink username={creator.username}>
            <strong>{displayName(creator)}</strong>
          </AuthorLink> · <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {edited && ' · edited'}
        </p>
        {comment.content && <p className="comment__content">{comment.content}</p>}
        {comment.photo && (
          <button type="button" className="comment__photo" onClick={() => openPhotoViewer({ photos: [commentPhotoDisplay(comment.photo!)] })}>
            <img
              src={commentPhotoDisplay(comment.photo).src}
              srcSet={commentPhotoDisplay(comment.photo).srcSet}
              sizes="240px"
              alt="Photo in the comment"
              loading="lazy"
              style={{ aspectRatio: `${comment.photo.width} / ${comment.photo.height}` }}
            />
          </button>
        )}
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
