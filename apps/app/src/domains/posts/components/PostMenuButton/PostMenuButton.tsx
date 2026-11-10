import { IonButton, IonIcon } from '@ionic/react';
import type { PostView } from '@myapp/shared/domains';
import { ellipsisHorizontal } from 'ionicons/icons';
import { ComposeListingModal } from '../ComposeListingModal/ComposeListingModal';
import { ComposePostModal } from '../ComposePostModal/ComposePostModal';
import { usePostMenuButton } from './usePostMenuButton';

/** A post's "more" button, and the editor it opens for your own posts (the listing form for a listing). */
export function PostMenuButton({ post, onDeleted }: { post: PostView; onDeleted?: () => void }) {
  const { openMenu, isEditing, stopEditing } = usePostMenuButton({ post, onDeleted });

  return (
    <>
      <IonButton fill="clear" color="medium" onClick={() => void openMenu()}>
        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
        <span className="visually-hidden">More</span>
      </IonButton>
      {post.listing ? (
        <ComposeListingModal isOpen={isEditing} post={post} onDismiss={stopEditing} />
      ) : (
        <ComposePostModal isOpen={isEditing} post={post} onDismiss={stopEditing} />
      )}
    </>
  );
}
