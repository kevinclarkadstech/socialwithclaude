import { profileImageKey, profileImageWidths, type ProfileImageKind, type UserProfileSummary } from '@myapp/shared/domains';
import { config } from '../../../lib/config';

/**
 * The URL of a user's avatar or cover at `width`. It's at a fixed key per
 * user, so ?v= (their profile's updatedAt) makes a new image show everywhere
 * at once despite the year-long cache. Users without one get a 404, and the
 * app shows initials or the gradient instead.
 */
export function profileImageUrl({ user, kind, width }: {
  user: Pick<UserProfileSummary, 'userId' | 'updatedAt'>;
  kind: ProfileImageKind;
  width: number;
}): string {
  return `${config.mediaUrl}/${profileImageKey({ userId: user.userId, kind, width })}?v=${Date.parse(user.updatedAt)}`;
}

/** The smallest stored width that covers `displayWidth` CSS pixels on this screen. */
export function profileImageWidthFor({ kind, displayWidth }: { kind: ProfileImageKind; displayWidth: number }): number {
  const widths = profileImageWidths[kind];
  const needed = displayWidth * (window.devicePixelRatio || 1);
  return widths.find((width) => width >= needed) ?? widths[widths.length - 1]!;
}
