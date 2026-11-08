import { Share } from '@capacitor/share';
import { showErrorToast, showToast } from './toasts';

/**
 * Opens the system share sheet for a link (native apps and browsers that
 * have one); elsewhere, copies the link and says so.
 */
export async function shareLink({ title, url }: { title: string; url: string }) {
  const { value: canShare } = await Share.canShare();
  if (canShare) {
    try {
      await Share.share({ title, url });
    } catch {
      // Closing the share sheet without choosing anything rejects; nothing to do.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    void showToast('Link copied');
  } catch {
    void showErrorToast(`Couldn't copy the link: ${url}`);
  }
}
