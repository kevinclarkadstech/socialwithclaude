import type { PostView } from '@myapp/shared/domains';
import { errorMessage } from '../../../../lib/api/errors';
import { orThrow } from '../../../../lib/api/results';
import { showErrorToast } from '../../../../lib/toasts';
import { runCreateUserSaveMutation } from '../../../users/operations/runCreateUserSaveMutation/runCreateUserSaveMutation';
import { runDeleteUserSaveMutation } from '../../../users/operations/runDeleteUserSaveMutation/runDeleteUserSaveMutation';
import { postStore } from '../../postStore';

/** Saves or unsaves a post. Every list showing it updates right away, and it's undone if the request fails. */
export function useSavePost() {
  async function setSaved(post: PostView, save: boolean) {
    if (postStore.getItem(post.id)?.viewer.hasSaved === save) {
      // Already that way, e.g. a double tap.
      return;
    }
    const previous = postStore.updateItem(post.id, (current) => ({
      ...current,
      numSaves: current.numSaves + (save ? 1 : -1),
      viewer: { ...current.viewer, hasSaved: save },
    }));

    try {
      const input = { type: 'post' as const, id: post.id };
      const result = save ? await runCreateUserSaveMutation(input) : await runDeleteUserSaveMutation(input);
      orThrow(result);
      // A list that reloaded meanwhile (e.g. right after signing in) may have brought the old state back.
      postStore.updateItem(post.id, (current) =>
        current.viewer.hasSaved === save
          ? current
          : { ...current, numSaves: current.numSaves + (save ? 1 : -1), viewer: { ...current.viewer, hasSaved: save } },
      );
    } catch (error) {
      if (previous) {
        postStore.restoreItem(previous);
      }
      void showErrorToast(errorMessage(error));
    }
  }

  return { setSaved };
}
