import { canBlockUser, canFollowUser, canUnblockUser, canUnfollowUser, type GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { displayName } from '../../../../utils/formatters/names';
import { config } from '../../../../lib/config';
import { chooseFrom, confirm } from '../../../../lib/prompts';
import { shareLink } from '../../../../lib/share';
import { blockUser } from '../../actions/blockUser/blockUser';
import { followUser } from '../../actions/followUser/followUser';
import { unblockUser } from '../../actions/unblockUser/unblockUser';
import { unfollowUser } from '../../actions/unfollowUser/unfollowUser';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';

/**
 * A profile header's actions: follow (asking first to sign in), unfollow or
 * withdraw a request, share, and block or unblock from the menu. Following
 * changes the profile on screen straight away; blocking reloads it (see useUserProfile).
 */
export function useProfileHeader({ profile, onProfileChange }: {
  profile: GetUserProfileQueryOutput;
  onProfileChange: (profile: GetUserProfileQueryOutput) => void;
}) {
  const { callingUser } = useCallingUser();
  const followCheck = canFollowUser({ caller: callingUser, target: profile });
  const unfollowCheck = canUnfollowUser({ caller: callingUser });
  const unblockCheck = canUnblockUser({ caller: callingUser });
  // The menu offers one of the two, so it opens only if that one is allowed.
  const menuCheck = profile.viewer.hasBlocked
    ? canUnblockUser({ caller: callingUser })
    : canBlockUser({ caller: callingUser, target: profile });

  async function follow() {
    const result = await followUser({ profile });
    if (!result.ok) {
      return;
    }
    const accepted = result.value.status === 'accepted';
    onProfileChange({
      ...profile,
      numFollowers: profile.numFollowers + (accepted ? 1 : 0),
      viewer: {
        ...profile.viewer,
        followStatus: accepted ? 'following' : 'requested',
        canSeePosts: profile.viewer.canSeePosts || accepted,
      },
    });
  }

  async function unfollow() {
    const wasFollowing = profile.viewer.followStatus === 'following';
    const confirmed = await confirm(
      wasFollowing
        ? { header: `Unfollow @${profile.username}?`, message: 'You can follow them again any time.', confirmText: 'Unfollow' }
        : { header: 'Withdraw your request?', message: `@${profile.username} won't see it any more.`, confirmText: 'Withdraw' },
    );
    if (!confirmed) {
      return;
    }
    const result = await unfollowUser({ profile });
    if (!result.ok) {
      return;
    }
    onProfileChange({
      ...profile,
      numFollowers: Math.max(0, profile.numFollowers - (wasFollowing ? 1 : 0)),
      viewer: { ...profile.viewer, followStatus: 'none', canSeePosts: profile.profileVisibility === 'public' },
    });
  }

  async function block() {
    const confirmed = await confirm({
      header: `Block @${profile.username}?`,
      message: "They won't be able to find your profile or follow you, and you won't see their posts here.",
      confirmText: 'Block',
    });
    if (!confirmed) {
      return;
    }
    await blockUser({ profile });
  }

  async function openMenu() {
    const choice = await chooseFrom({
      options: [
        profile.viewer.hasBlocked
          ? { text: 'Unblock', value: 'unblock' as const }
          : { text: 'Block', value: 'block' as const, role: 'destructive' as const },
      ],
    });
    if (choice === 'block') {
      await block();
    }
    if (choice === 'unblock') {
      await unblockUser({ profile });
    }
  }

  return {
    follow: () => {
      if (!followCheck.ok) {
        disallowedActions.emit({ error: followCheck.error, action: () => void follow() });
        return;
      }
      void follow();
    },
    unfollow: () => {
      if (!unfollowCheck.ok) {
        disallowedActions.emit({ error: unfollowCheck.error, action: () => void unfollow() });
        return;
      }
      void unfollow();
    },
    unblock: () => {
      const action = () => void unblockUser({ profile });
      if (!unblockCheck.ok) {
        disallowedActions.emit({ error: unblockCheck.error, action });
        return;
      }
      action();
    },
    openMenu: () => {
      if (!menuCheck.ok) {
        disallowedActions.emit({ error: menuCheck.error, action: () => void openMenu() });
        return;
      }
      void openMenu();
    },
    share: () => shareLink({ title: displayName(profile), url: `${config.publicUrl}/users/${profile.username}` }),
  };
}
