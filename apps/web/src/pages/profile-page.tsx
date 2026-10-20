import * as React from "react"
import { IconArrowLeft, IconMessageCircle } from "@tabler/icons-react"

import { PostList } from "@/components/post-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { api, apiErrorMessage } from "@/lib/api"
import { signOut } from "@/lib/auth"
import { displayName } from "@/lib/people"
import { monthYear } from "@/lib/time"

export type Profile = Awaited<ReturnType<typeof api.users.getUserProfile.query>>

type ProfileState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; profile: Profile }

const compact = new Intl.NumberFormat(undefined, { notation: "compact" })

/**
 * A user's profile: who they are, follower counts, Follow and Message (when
 * it isn't you), and their posts.
 */
export function ProfilePage({
  username,
  myUserId,
  onBack,
  onMessage,
  onOpenProfile,
}: {
  username: string
  myUserId: string
  /** Shows a back button when given. */
  onBack?: () => void
  /** Open (or start) a chat with them; rejects if that fails. */
  onMessage: (profile: Profile) => Promise<void>
  onOpenProfile: (username: string) => void
}) {
  const [state, setState] = React.useState<ProfileState>({ status: "loading" })

  React.useEffect(() => {
    let cancelled = false
    api.users.getUserProfile
      .query({ username })
      .then((profile) => !cancelled && setState({ status: "ready", profile }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status:
              apiErrorMessage(err) === "NOT_FOUND" ? "not-found" : "error",
          })
      )
    return () => {
      cancelled = true
    }
  }, [username])

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
            profile={state.profile}
            isMe={state.profile.userId === myUserId}
            onMessage={onMessage}
          />
          <PostList
            key={state.profile.userId}
            loadPage={(cursor) =>
              api.posts.getUserPosts.query({ username, cursor })
            }
            onOpenProfile={onOpenProfile}
            emptyMessage={`@${state.profile.username} hasn't posted yet.`}
            errorMessage={(err) =>
              apiErrorMessage(err) === "POSTS_FOLLOWERS_ONLY"
                ? `Only followers can see @${state.profile.username}'s posts.`
                : "Couldn't load posts."
            }
          />
        </>
      ) : state.status === "loading" ? null : (
        <p className="text-center text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This account isn't available."
            : "Couldn't load this profile."}
        </p>
      )}
    </div>
  )
}

function ProfileHeader({
  profile,
  isMe,
  onMessage,
}: {
  profile: Profile
  isMe: boolean
  onMessage: (profile: Profile) => Promise<void>
}) {
  const [following, setFollowing] = React.useState(profile.isFollowing)
  const [messaging, setMessaging] = React.useState(false)
  const [messageFailed, setMessageFailed] = React.useState(false)
  const [numFollowers, setNumFollowers] = React.useState(profile.numFollowers)
  const [pending, setPending] = React.useState(false)

  async function toggleFollow() {
    const next = !following
    setFollowing(next)
    setNumFollowers((n) => n + (next ? 1 : -1))
    setPending(true)
    try {
      if (next) await api.users.follow.mutate({ username: profile.username })
      else await api.users.unfollow.mutate({ username: profile.username })
    } catch {
      setFollowing(!next)
      setNumFollowers((n) => n + (next ? -1 : 1))
    } finally {
      setPending(false)
    }
  }

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
              variant={following ? "outline" : "default"}
              onClick={toggleFollow}
              disabled={pending}
              aria-pressed={following}
            >
              {following ? "Following" : "Follow"}
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
