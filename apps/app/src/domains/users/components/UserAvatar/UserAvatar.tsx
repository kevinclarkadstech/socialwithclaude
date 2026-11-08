import { IonAvatar } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { initials } from '../../../../common/formatters/names';
import { userHue } from '../../utils/userHue';
import './UserAvatar.css';

interface UserAvatarProps {
  user: Pick<UserProfileSummary, 'userId' | 'username' | 'firstName' | 'lastName'>;
  size?: number;
  slot?: string;
  className?: string;
}

/**
 * A user's avatar: their initials on a color picked from their id. Images
 * will be derived from the user id later; the initials then become the
 * fallback.
 */
export function UserAvatar({ user, size = 40, slot, className }: UserAvatarProps) {
  return (
    <IonAvatar
      slot={slot}
      className={className ? `user-avatar ${className}` : 'user-avatar'}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${userHue(user.userId)} 55% 45%)` }}
      aria-hidden="true"
    >
      {initials(user)}
    </IonAvatar>
  );
}
