import { IonAvatar } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { initials } from '../formatters/names';
import './UserAvatar.css';

/** A steady color per user, so the same person always looks the same. */
function hueOf(userId: string): number {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

interface UserAvatarProps {
  user: Pick<UserProfileSummary, 'userId' | 'username' | 'firstName' | 'lastName'>;
  size?: number;
  slot?: string;
}

/**
 * A user's avatar: their initials on a color picked from their id. Images
 * will be derived from the user id later; the initials then become the
 * fallback.
 */
export function UserAvatar({ user, size = 40, slot }: UserAvatarProps) {
  return (
    <IonAvatar
      slot={slot}
      className="user-avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hueOf(user.userId)} 55% 45%)` }}
      aria-hidden="true"
    >
      {initials(user)}
    </IonAvatar>
  );
}
