import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { GetUserProfileQueryOutput, UserPostsType } from '@myapp/shared/domains';
import { ellipsisHorizontal, lockClosedOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { displayName } from '../../utils/formatters/names';
import { useRequireSignIn } from '../../common/hooks/useRequireSignIn';
import { chooseFrom } from '../../lib/prompts';
import { BackButton, useTabHref } from '../../navigation';
import { useAuth } from '../../domains/auth/hooks/useAuth';
import { applyCreatorChange } from '../../domains/posts/utils/applyCreatorChange';
import { PostCard } from '../../domains/posts/components/PostCard/PostCard';
import { useUserPosts } from '../../domains/posts/hooks/useUserPosts';
import { EditProfileModal } from '../../domains/users/components/EditProfileModal/EditProfileModal';
import { ProfileHeader } from '../../domains/users/components/ProfileHeader/ProfileHeader';
import { useCallingUser } from '../../domains/users/hooks/useCallingUser';
import { useUserProfile } from '../../domains/users/hooks/useUserProfile';
import '../../common/styles/pages.css';
import './UserProfilePage.css';

/**
 * A profile: /<tab>/users/:username for anyone, and /me for your own. Its
 * header, then its posts or listings, unless the profile is private (and
 * you don't follow it) or blocked.
 */
export function UserProfilePage() {
  const params = useParams<{ username?: string }>();
  const { callingUser, isLoaded } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const tabHref = useTabHref();
  const ownUsername = callingUser?.profile?.username ?? null;
  // /me has no username in the path: it's yours.
  const username = params.username ?? ownUsername;
  const isOwn = username !== null && username === ownUsername;

  const { profile, status, reload, setProfile } = useUserProfile({ username });
  const [type, setType] = useState<UserPostsType>('posts');
  const posts = useUserPosts({ profile, type });
  const [isEditing, setIsEditing] = useState(false);

  async function openOwnMenu() {
    const choice = await chooseFrom({ options: [{ text: 'Sign out', value: 'sign-out' as const }] });
    if (choice === 'sign-out') {
      await signOut();
    }
  }

  /** A change to the profile (e.g. a new photo) also shows on its posts and comments already loaded. */
  function onProfileChange(changed: GetUserProfileQueryOutput) {
    setProfile(changed);
    applyCreatorChange(changed);
  }

  async function refresh() {
    await Promise.all([reload(), profile?.viewer.canSeePosts ? posts.refresh() : null]);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>{profile ? displayName(profile) : 'Profile'}</IonTitle>
          {isOwn && (
            <IonButtons slot="end">
              <IonButton onClick={() => void openOwnMenu()}>
                <IonIcon slot="icon-only" icon={ellipsisHorizontal} aria-hidden="true" />
                <span className="visually-hidden">More</span>
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(event) => void refresh().finally(() => event.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        {/* /me while signed out, or before finishing sign-up. */}
        {!username && isLoaded && (
          <div className="page-message user-profile__gate">
            <p>{callingUser ? 'Finish signing up to get a profile.' : 'Sign in to see your profile.'}</p>
            <IonButton onClick={() => requireSignIn()}>{callingUser ? 'Finish sign-up' : 'Sign in'}</IonButton>
          </div>
        )}
        {username && status === 'loading' && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {status === 'not-found' && <p className="page-message">This profile doesn't exist.</p>}
        {status === 'failed' && <p className="page-message">Couldn't load this profile. Pull down to try again.</p>}

        {profile && status === 'ready' && (
          <div className="user-profile">
            <ProfileHeader
              profile={profile}
              isOwn={isOwn}
              onProfileChange={onProfileChange}
              onEdit={() => setIsEditing(true)}
            />

            <IonSegment
              className="user-profile__segment"
              value={type}
              onIonChange={(event) => setType(event.detail.value as UserPostsType)}
            >
              <IonSegmentButton value="posts">
                <IonLabel>Posts</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="listings">
                <IonLabel>Listings</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {profile.viewer.hasBlocked && (
              <p className="page-message">You blocked @{profile.username}. Unblock them to see their posts.</p>
            )}
            {!profile.viewer.hasBlocked && !profile.viewer.canSeePosts && (
              <div className="page-message user-profile__private">
                <IonIcon icon={lockClosedOutline} aria-hidden="true" />
                <strong>This account is private</strong>
                <span>Follow @{profile.username} to see their posts and listings.</span>
              </div>
            )}

            {profile.viewer.canSeePosts && (
              <>
                {posts.isLoading && (
                  <div className="page-message">
                    <IonSpinner />
                  </div>
                )}
                {posts.error !== null && <p className="page-message">Couldn't load these. Pull down to try again.</p>}
                {!posts.isLoading && posts.error === null && posts.ids.length === 0 && (
                  <p className="page-message">{type === 'posts' ? 'No posts yet.' : 'No listings yet.'}</p>
                )}
                {posts.ids.map((id) => (
                  <PostCard key={id} postId={id} linkToAuthor={false} />
                ))}
                <IonInfiniteScroll
                  disabled={!posts.hasMore}
                  onIonInfinite={(event) => void posts.loadMore().finally(() => event.target.complete())}
                >
                  <IonInfiniteScrollContent />
                </IonInfiniteScroll>
              </>
            )}
          </div>
        )}

        {isOwn && (
          <EditProfileModal
            isOpen={isEditing}
            onDismiss={() => setIsEditing(false)}
            onSaved={(saved) => {
              applyCreatorChange(saved);
              // On /<tab>/users/:username, follow a new username; /me follows it already.
              if (params.username && saved.username !== params.username) {
                navigate(tabHref(`users/${saved.username}`), { replace: true });
                return;
              }
              void reload();
            }}
          />
        )}
      </IonContent>
    </IonPage>
  );
}
