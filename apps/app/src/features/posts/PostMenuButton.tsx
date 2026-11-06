import { IonButton, IonIcon, useIonActionSheet } from '@ionic/react';
import { canDeletePost, canUpdatePost } from '@myapp/shared/logic/authorization';
import type { Post } from '@myapp/shared/domains';
import { ellipsisHorizontal } from 'ionicons/icons';
import { useState } from 'react';
import { useRequireSignIn } from '../../common/hooks/useRequireSignIn';
import { usePrompts } from '../../common/hooks/usePrompts';
import { usePostActions } from '../../domains/posts/hooks/usePostActions';
import { useCallingUser } from '../../domains/users/hooks/useCallingUser';
import { ComposePostModal } from './ComposePostModal';

/**
 * A post's "more" menu: edit and delete for your own posts, report for
 * everyone else's. What's offered comes from the same can* checks the API
 * enforces.
 */
export function PostMenuButton({ post, onDeleted }: { post: Post; onDeleted?: () => void }) {
  const { callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const { deletePost, reportPost } = usePostActions();
  const { confirm, askForReport } = usePrompts();
  const [presentActionSheet] = useIonActionSheet();
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = canUpdatePost(callingUser, post).ok;
  const canDelete = canDeletePost(callingUser, post).ok;

  async function removePost() {
    const confirmed = await confirm({
      header: 'Delete this post?',
      message: "It'll be removed for everyone. This can't be undone.",
      confirmText: 'Delete',
    });
    if (confirmed && (await deletePost(post.id))) {
      onDeleted?.();
    }
  }

  async function report() {
    const answer = await askForReport();
    if (answer) {
      await reportPost(post.id, answer);
    }
  }

  function open() {
    void presentActionSheet({
      buttons: [
        ...(canEdit ? [{ text: 'Edit', handler: () => setIsEditing(true) }] : []),
        ...(canDelete ? [{ text: 'Delete', role: 'destructive', handler: () => void removePost() }] : []),
        ...(!canEdit ? [{ text: 'Report', handler: () => requireSignIn(() => void report()) }] : []),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
  }

  return (
    <>
      <IonButton fill="clear" color="medium" onClick={open}>
        <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
        <span className="visually-hidden">More</span>
      </IonButton>
      <ComposePostModal isOpen={isEditing} post={post} onDismiss={() => setIsEditing(false)} />
    </>
  );
}
