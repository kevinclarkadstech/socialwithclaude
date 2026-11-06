import type { UserProfileSummary } from '@myapp/shared/domains';
import { initials } from '../utils/names';
import './UserAvatar.css';

/** A steady color per user, so the same person always looks the same. */
function hueOf(userId: string): number {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

/**
 * A user's avatar: their initials on a color picked from their id. (Profile
 * images will be derived from the user id later, so nothing is stored.)
 */
export function UserAvatar({ user, size = 40 }: { user: UserProfileSummary; size?: number }) {
  return (
    <span
      className="user-avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hueOf(user.userId)} 55% 45%)` }}
      aria-hidden="true"
    >
      {initials(user)}
    </span>
  );
}
