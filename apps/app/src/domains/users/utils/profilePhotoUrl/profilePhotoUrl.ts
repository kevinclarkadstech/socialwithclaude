import { profilePhotoKey, profilePhotoWidths, type ProfilePhotoKind, type UserProfileSummary } from '@myapp/shared/domains';
import { config } from '../../../../lib/config';

/**
 * The URL of a user's avatar or cover at `width`. It's at a fixed key per
 * user, so ?v= (their profile's updatedAt) makes a new photo show everywhere
 * at once despite the year-long cache. Users without one get a 404, and the
 * app shows initials or the gradient instead.
 */
export function profilePhotoUrl({ user, kind, width }: {
  user: Pick<UserProfileSummary, 'userId' | 'updatedAt'>;
  kind: ProfilePhotoKind;
  width: number;
}): string {
  return `${config.mediaUrl}/${profilePhotoKey({ userId: user.userId, kind, width })}?v=${Date.parse(user.updatedAt)}`;
}

/** The smallest stored width that covers `displayWidth` CSS pixels on this screen. */
export function profilePhotoWidthFor({ kind, displayWidth }: { kind: ProfilePhotoKind; displayWidth: number }): number {
  const widths = profilePhotoWidths[kind];
  const needed = displayWidth * (window.devicePixelRatio || 1);
  return widths.find((width) => width >= needed) ?? widths[widths.length - 1]!;
}
