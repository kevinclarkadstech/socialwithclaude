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
import { useLocation, useNavigate, useParams } from 'react-router';
import { displayName } from '../../utils/formatters/names';
import { chooseFrom } from '../../lib/prompts';
import { BackButton, useTabHref } from '../../navigation';
import { useAuth } from '../../domains/auth';
import { applyCreatorChange, PostCard, useUserPosts } from '../../domains/posts';
import { EditProfileModal, ProfileHeader, useCallingUser, useUserProfile } from '../../domains/users';
import '../../common/styles/pages.css';
import './UserProfilePage.css';

/**
 * A profile, at /profile/:username (a full page: your own, from the
 * account button, and shared links) or /<tab>/profile/:username (opened
 * from inside a tab, e.g. a post's author): its header, then its posts or
 * listings, unless the profile is private (and you don't follow it) or
 * blocked. When it's the signed-in user's own, it also offers editing, its
 * photos, Settings and sign-out.
 */
export function UserProfilePage() {
  const params = useParams<{ username?: string }>();
  const { callingUser } = useCallingUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const tabHref = useTabHref();
  const { pathname } = useLocation();
  const ownUsername = callingUser?.profile?.username ?? null;
  const username = params.username ?? null;
  const isOwn = username !== null && username === ownUsername;

  const { profile, status, reload, setProfile } = useUserProfile({ username });
  const [type, setType] = useState<UserPostsType>('posts');
  const posts = useUserPosts({ profile, type });
  const [isEditing, setIsEditing] = useState(false);

  async function openOwnMenu() {
    const choice = await chooseFrom({
      options: [
        { text: 'Settings', value: 'settings' as const },
        { text: 'Sign out', value: 'sign-out' as const },
      ],
    });
    if (choice === 'settings') {
      navigate('/settings');
    }
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
              // A new username is a new URL.
              if (saved.username !== username) {
                const path = pathname.startsWith('/profile/') ? `/profile/${saved.username}` : tabHref(`profile/${saved.username}`);
                navigate(path, { replace: true });
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
