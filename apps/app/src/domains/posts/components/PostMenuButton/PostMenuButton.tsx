import { IonButton, IonIcon } from '@ionic/react';
import type { Post } from '@myapp/shared/domains';
import { ellipsisHorizontal } from 'ionicons/icons';
import { ComposePostModal } from '../ComposePostModal/ComposePostModal';
import { usePostMenuButton } from './usePostMenuButton';

/** A post's "more" button, and the editor it opens for your own posts. */
export function PostMenuButton({ post, onDeleted }: { post: Post; onDeleted?: () => void }) {
  const { openMenu, isEditing, stopEditing } = usePostMenuButton({ post, onDeleted });

  return (
    <>
      <IonButton fill="clear" color="medium" onClick={() => void openMenu()}>
        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
        <span className="visually-hidden">More</span>
      </IonButton>
      <ComposePostModal isOpen={isEditing} post={post} onDismiss={stopEditing} />
    </>
  );
}
