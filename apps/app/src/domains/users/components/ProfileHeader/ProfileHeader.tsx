import { IonButton, IonIcon } from '@ionic/react';
import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { camera, ellipsisHorizontal, lockClosed, shareOutline } from 'ionicons/icons';
import { useState, type CSSProperties } from 'react';
import { PhotoCropModal } from '../../../../common/components/PhotoCropModal/PhotoCropModal';
import { displayName } from '../../../../utils/formatters/names';
import { profilePhotoUrl, profilePhotoWidthFor } from '../../utils/profilePhotoUrl/profilePhotoUrl';
import { userHue } from '../../utils/userHue/userHue';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { useProfileHeader } from './useProfileHeader';
import { useProfilePhotoEditor } from './useProfilePhotoEditor';
import './ProfileHeader.css';

interface ProfileHeaderProps {
  profile: GetUserProfileQueryOutput;
  /** The signed-in user's own profile: Edit instead of Follow. */
  isOwn: boolean;
  onProfileChange: (profile: GetUserProfileQueryOutput) => void;
  onEdit: () => void;
}

const counts = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/**
 * The top of a profile: a cover, the avatar over its edge, the actions
 * (Follow or Edit, share, the menu), name, about, and counts. The cover is
 * a gradient in the user's own colour until profiles have photos.
 */
export function ProfileHeader({ profile, isOwn, onProfileChange, onEdit }: ProfileHeaderProps) {
  const { follow, unfollow, unblock, openMenu, share } = useProfileHeader({ profile, onProfileChange });
  const { fileInputRef, crop, openMenu: openPhotoMenu, onPhotoChosen, cancel, save } = useProfilePhotoEditor({ profile, onProfileChange });
  const { followStatus, hasBlocked } = profile.viewer;
  const coverSrc = profilePhotoUrl({
    user: profile,
    kind: 'cover',
    width: profilePhotoWidthFor({ kind: 'cover', displayWidth: Math.min(window.innerWidth, 640) }),
  });
  // Which src failed, so a new cover is tried again.
  const [failedCoverSrc, setFailedCoverSrc] = useState<string | null>(null);
  const hasName = Boolean(profile.firstName || profile.lastName);

  return (
    <header className="profile-header">
      <div className="profile-header__cover" style={{ '--profile-hue': userHue(profile.userId) } as CSSProperties}>
        {failedCoverSrc !== coverSrc && (
          <img className="profile-header__cover-photo" src={coverSrc} alt="" decoding="async" onError={() => setFailedCoverSrc(coverSrc)} />
        )}
        {isOwn && (
          <IonButton size="small" className="profile-header__edit-cover" onClick={() => openPhotoMenu('cover')}>
            <IonIcon slot="icon-only" icon={camera} aria-hidden="true" />
            <span className="visually-hidden">Change cover photo</span>
          </IonButton>
        )}
      </div>

      <div className="profile-header__row">
        <div className="profile-header__avatar-wrap">
          <UserAvatar user={profile} size={88} className="profile-header__avatar" />
          {isOwn && (
            <IonButton size="small" className="profile-header__edit-avatar" onClick={() => openPhotoMenu('avatar')}>
              <IonIcon slot="icon-only" icon={camera} aria-hidden="true" />
              <span className="visually-hidden">Change profile photo</span>
            </IonButton>
          )}
        </div>
        <div className="profile-header__actions">
          {isOwn && (
            <IonButton fill="outline" onClick={onEdit}>
              Edit profile
            </IonButton>
          )}
          {!isOwn && hasBlocked && (
            <IonButton fill="outline" onClick={() => void unblock()}>
              Unblock
            </IonButton>
          )}
          {!isOwn && !hasBlocked && followStatus === 'none' && (
            <IonButton data-follow-status={followStatus} onClick={follow}>
              Follow
            </IonButton>
          )}
          {!isOwn && !hasBlocked && followStatus !== 'none' && (
            <IonButton fill="outline" data-follow-status={followStatus} onClick={() => void unfollow()}>
              {followStatus === 'following' ? 'Following' : 'Requested'}
            </IonButton>
          )}
          <IonButton fill="outline" className="profile-header__icon-button" onClick={() => void share()}>
            <IonIcon slot="icon-only" icon={shareOutline} aria-hidden="true" />
            <span className="visually-hidden">Share profile</span>
          </IonButton>
          {!isOwn && (
            <IonButton fill="clear" color="medium" className="profile-header__icon-button" onClick={openMenu}>
              <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
              <span className="visually-hidden">More</span>
            </IonButton>
          )}
        </div>
      </div>

      <div className="profile-header__about">
        <h1 className="profile-header__name">{displayName(profile)}</h1>
        {/* Without a name, the name above is already @username. */}
        {(hasName || profile.profileVisibility === 'followers') && (
          <p className="profile-header__username">
            {hasName && `@${profile.username}`}
            {hasName && profile.profileVisibility === 'followers' && ' · '}
            {profile.profileVisibility === 'followers' && (
              <>
                <IonIcon icon={lockClosed} aria-hidden="true" /> Private
              </>
            )}
          </p>
        )}
        {profile.about && <p className="profile-header__bio">{profile.about}</p>}
      </div>

      <dl className="profile-header__stats">
        <div>
          <dt>{profile.numPosts === 1 ? 'Post' : 'Posts'}</dt>
          <dd>{counts.format(profile.numPosts)}</dd>
        </div>
        <div>
          <dt>{profile.numFollowers === 1 ? 'Follower' : 'Followers'}</dt>
          <dd>{counts.format(profile.numFollowers)}</dd>
        </div>
        <div>
          <dt>Following</dt>
          <dd>{counts.format(profile.numFollowing)}</dd>
        </div>
      </dl>
      {isOwn && (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPhotoChosen} />
          <PhotoCropModal
            isOpen={crop !== null}
            photoUrl={crop?.photoUrl ?? null}
            title={crop?.title ?? ''}
            aspectRatio={crop?.aspectRatio ?? 1}
            shape={crop?.shape}
            onCancel={cancel}
            onConfirm={save}
          />
        </>
      )}
    </header>
  );
}
