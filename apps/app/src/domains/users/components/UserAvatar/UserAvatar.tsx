import { IonAvatar } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { useState } from 'react';
import { initials } from '../../../../utils/formatters/names';
import { profilePhotoUrl, profilePhotoWidthFor } from '../../utils/profilePhotoUrl';
import { userHue } from '../../utils/userHue';
import './UserAvatar.css';

interface UserAvatarProps {
  user: Pick<UserProfileSummary, 'userId' | 'username' | 'firstName' | 'lastName' | 'updatedAt'>;
  size?: number;
  slot?: string;
  className?: string;
}

/**
 * A user's avatar: their photo, over their initials on a colour picked from
 * their id. The initials show while it loads, and stay if they have no photo.
 */
export function UserAvatar({ user, size = 40, slot, className }: UserAvatarProps) {
  const src = profilePhotoUrl({ user, kind: 'avatar', width: profilePhotoWidthFor({ kind: 'avatar', displayWidth: size }) });
  // Which src failed (rather than a flag), so a new photo is tried again.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  return (
    <IonAvatar
      slot={slot}
      className={className ? `user-avatar ${className}` : 'user-avatar'}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${userHue(user.userId)} 55% 45%)` }}
      aria-hidden="true"
    >
      {initials(user)}
      {failedSrc !== src && (
        <img
          className="user-avatar__photo"
          data-loaded={String(loadedSrc === src)}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
    </IonAvatar>
  );
}
