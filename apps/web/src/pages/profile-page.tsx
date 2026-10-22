import * as React from "react"
import { IconArrowLeft, IconMessageCircle } from "@tabler/icons-react"

import { FollowRequests } from "@/components/follow-requests"
import { PostList } from "@/components/post-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import type { FollowStatus, Profile } from "@/hooks/types"
import { useAuth } from "@/hooks/use-auth"
import { useUserPosts } from "@/hooks/use-posts"
import { useFollow, useProfile } from "@/hooks/use-profile"
import { displayName } from "@/lib/people"
import { monthYear } from "@/lib/time"

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

/**
 * A user's profile: who they are, follower counts, Follow and Message (when
 * it isn't you), and their posts. On your own profile, your pending follow
 * requests too.
 */
export function ProfilePage({
  username,
  myUserId,
  onBack,
  onMessage,
  onOpenProfile,
  onOpenPost,
  onFollowRequestsChanged,
}: {
  username: string
  myUserId: string
  /** Shows a back button when given. */
  onBack?: () => void
  /** Open (or start) a chat with them; rejects if that fails. */
  onMessage: (profile: Profile) => Promise<void>
  onOpenProfile: (username: string) => void
  onOpenPost: (postId: string) => void
  /** Called after you accept or deny a follow request. */
  onFollowRequestsChanged?: () => void
}) {
  const state = useProfile(username)
  // Followers gained by accepting requests here (shown in the count).
  const [accepted, setAccepted] = React.useState(0)

  return (
    <div className="flex flex-col gap-4">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={onBack}
        >
          <IconArrowLeft />
          Back
        </Button>
      )}

      {state.status === "ready" ? (
        <>
          <ProfileHeader
            profile={state.data}
            isMe={state.data.userId === myUserId}
            acceptedFollowers={accepted}
            onMessage={onMessage}
          />
          {state.data.userId === myUserId && (
            <FollowRequests
              onOpenProfile={onOpenProfile}
              onAccepted={() => setAccepted((n) => n + 1)}
              onChanged={onFollowRequestsChanged}
            />
          )}
          <UserPosts
            username={state.data.username}
            onOpenProfile={onOpenProfile}
            onOpenPost={onOpenPost}
          />
        </>
      ) : state.status === "loading" ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {state.status === "failed" && state.reason === "not-found"
            ? "This account isn't available."
            : "Couldn't load this profile."}
        </p>
      )}
    </div>
  )
}

const FOLLOW_LABELS: Record<FollowStatus, string> = {
  none: "Follow",
  requested: "Requested",
  following: "Following",
}

function ProfileHeader({
  profile,
  isMe,
  acceptedFollowers,
  onMessage,
}: {
  profile: Profile
  isMe: boolean
  /** Followers added since the profile loaded (accepted requests). */
  acceptedFollowers: number
  onMessage: (profile: Profile) => Promise<void>
}) {
  const { signOut } = useAuth()
  const {
    followStatus,
    pending,
    toggle: toggleFollow,
    followerDelta,
  } = useFollow(profile)
  const [messaging, setMessaging] = React.useState(false)
  const [messageFailed, setMessageFailed] = React.useState(false)
  const numFollowers = profile.numFollowers + acceptedFollowers + followerDelta

  async function message() {
    setMessaging(true)
    setMessageFailed(false)
    try {
      await onMessage(profile)
    } catch {
      setMessageFailed(true)
      setMessaging(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar person={profile} className="size-16 text-lg" />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-lg font-medium">
              {displayName(profile)}
            </h1>
            <span className="truncate text-sm text-muted-foreground">
              @{profile.username}
            </span>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {compact.format(numFollowers)}
            </span>{" "}
            {numFollowers === 1 ? "follower" : "followers"}
          </span>
          <span>
            <span className="font-medium text-foreground">
              {compact.format(profile.numFollowing)}
            </span>{" "}
            following
          </span>
          <span>Joined {monthYear(profile.createdAt)}</span>
        </div>

        {isMe && (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        )}

        {!isMe && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={followStatus === "none" ? "default" : "outline"}
              onClick={toggleFollow}
              disabled={pending}
              aria-pressed={followStatus !== "none"}
              title={
                followStatus === "requested"
                  ? "Cancel your follow request"
                  : undefined
              }
            >
              {FOLLOW_LABELS[followStatus]}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={message}
              disabled={messaging}
            >
              <IconMessageCircle />
              Message
            </Button>
          </div>
        )}
        {messageFailed && (
          <p className="text-sm text-destructive">
            Couldn&apos;t open the chat. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** A user's posts, or why you can't see them. */
function UserPosts({
  username,
  onOpenProfile,
  onOpenPost,
}: {
  username: string
  onOpenProfile: (username: string) => void
  onOpenPost: (postId: string) => void
}) {
  const list = useUserPosts(username)
  return (
    <PostList
      list={list}
      onOpenProfile={onOpenProfile}
      onOpenPost={onOpenPost}
      emptyMessage={`@${username} hasn't posted yet.`}
      errorMessage={(failure) =>
        failure === "followers-only"
          ? `Only followers can see @${username}'s posts.`
          : "Couldn't load posts."
      }
    />
  )
}
