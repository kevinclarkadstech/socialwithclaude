import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonListHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useParams } from 'react-router';
import { useRequireSignIn } from '../../common/hooks/useRequireSignIn';
import { CommentComposer, CommentItem, PostCard, usePostComments, usePostDetail } from '../../domains/posts';
import { useCallingUser } from '../../domains/users';
import { BackButton, useTabNavigation } from '../../navigation';
import '../../common/styles/pages.css';

/** A post on its own page (/<tab>/posts/:postId), with its comments. Reading comments needs sign-in. */
export function PostDetailPage() {
  const { postId = '' } = useParams();
  const { post, isLoading, notFound, error } = usePostDetail(postId);
  const { callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const { goBack } = useTabNavigation();
  const canReadComments = Boolean(callingUser?.profile);
  const comments = usePostComments(postId, { enabled: canReadComments && Boolean(post) });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>PostView</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {!post && notFound && <p className="page-message">This post was deleted, or never existed.</p>}
        {!post && error && <p className="page-message">{error}</p>}

        {post && (
          <>
            <PostCard postId={post.id} linkToPost={false} onDeleted={goBack} />

            {canReadComments ? (
              <IonList>
                <IonListHeader>Comments</IonListHeader>
                {comments.isLoading && (
                  <div className="page-message">
                    <IonSpinner />
                  </div>
                )}
                {comments.error !== null && <p className="page-message">Couldn't load the comments.</p>}
                {!comments.isLoading && comments.error === null && comments.ids.length === 0 && (
                  <p className="page-message">No comments yet. Start the conversation.</p>
                )}
                {comments.ids.map((id) => (
                  <CommentItem key={id} commentId={id} />
                ))}
              </IonList>
            ) : (
              <div className="page-message">
                <IonButton fill="outline" onClick={() => requireSignIn()}>
                  Sign in to read and write comments
                </IonButton>
              </div>
            )}

            <IonInfiniteScroll
              disabled={!canReadComments || !comments.hasMore}
              onIonInfinite={(event) => void comments.loadMore().finally(() => event.target.complete())}
            >
              <IonInfiniteScrollContent />
            </IonInfiniteScroll>
          </>
        )}
      </IonContent>
      {post && canReadComments && <CommentComposer postId={post.id} />}
    </IonPage>
  );
}
