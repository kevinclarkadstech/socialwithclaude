import * as React from "react"
import { cn } from "cn"

import { ChatList } from "@/components/chat/chat-list"
import { ChatView } from "@/components/chat/chat-view"
import { Feed } from "@/components/post-list"
import { NewPostForm } from "@/components/new-post-form"
import { Button } from "@/components/ui/button"
import {
  useStartChat,
  useUnreadMessageCount,
  type OpenChat,
} from "@/hooks/use-chats"
import { useFollowRequestCount } from "@/hooks/use-follow-requests"
import { type PersonSummary } from "@/lib/people"
import { ListingsPage } from "@/pages/listings-page"
import { ListingDetailPage } from "@/pages/listing-detail-page"
import { PostPage } from "@/pages/post-page"
import { ProfilePage } from "@/pages/profile-page"

type Tab = "feed" | "listings" | "messages" | "profile"

/** Pages opened over a tab; Back returns to the one below. */
type Overlay =
  | { kind: "profile"; username: string }
  | { kind: "listing"; id: string }
  | { kind: "post"; id: string }

/** Signed in with a profile: Feed, Listings, Messages and your Profile. */
export function HomePage({ me }: { me: PersonSummary & { userId: string } }) {
  const { userId, username } = me
  const [tab, setTab] = React.useState<Tab>("feed")
  const [openChat, setOpenChat] = React.useState<OpenChat | null>(null)
  const [overlays, setOverlays] = React.useState<Overlay[]>([])
  const overlay = overlays.at(-1)
  const { count: unread, refresh: refreshUnread } = useUnreadMessageCount()
  const { count: followRequests, refresh: refreshFollowRequests } =
    useFollowRequestCount()
  const startChat = useStartChat()
  // Bumped after posting so the feed reloads with the new post.
  const [feedVersion, setFeedVersion] = React.useState(0)
  const [listed, setListed] = React.useState(false)

  function showTab(next: Tab) {
    setTab(next)
    setOverlays([])
  }

  function openProfile(profileUsername: string) {
    if (profileUsername === username) showTab("profile")
    else
      setOverlays((o) => [...o, { kind: "profile", username: profileUsername }])
  }

  function openListing(id: string) {
    setOverlays((o) => [...o, { kind: "listing", id }])
  }

  function openPost(id: string) {
    setOverlays((o) => [...o, { kind: "post", id }])
  }

  const back = () => setOverlays((o) => o.slice(0, -1))

  /** Opens the chat with `person`; rejects if it can't be opened. */
  async function message(person: PersonSummary) {
    const result = await startChat(person.username, person)
    if (!result.ok) throw new Error(`Couldn't open the chat: ${result.error}`)
    setOpenChat(result.chat)
    showTab("messages")
  }

  return (
    <div className="min-h-svh bg-muted">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-4 p-4 md:py-8",
          // The listings grid and a listing's page get more room; everything
          // else is one column.
          overlay?.kind === "listing"
            ? "max-w-4xl"
            : tab === "listings" && !overlay
              ? "max-w-5xl"
              : "max-w-xl"
        )}
      >
        <div className="flex items-center gap-1 text-sm">
          <TabButton active={tab === "feed"} onClick={() => showTab("feed")}>
            Feed
          </TabButton>
          <TabButton
            active={tab === "listings"}
            onClick={() => showTab("listings")}
          >
            Listings
          </TabButton>
          <TabButton
            active={tab === "messages"}
            onClick={() => showTab("messages")}
          >
            Messages
            <CountBadge count={unread} label="unread messages" />
          </TabButton>
          <TabButton
            active={tab === "profile"}
            onClick={() => showTab("profile")}
          >
            Profile
            <CountBadge count={followRequests} label="follow requests" />
          </TabButton>
        </div>

        {overlay?.kind === "profile" && (
          <ProfilePage
            key={`profile:${overlays.length}:${overlay.username}`}
            username={overlay.username}
            myUserId={userId}
            onBack={back}
            onMessage={message}
            onOpenProfile={openProfile}
            onOpenPost={openPost}
          />
        )}
        {overlay?.kind === "listing" && (
          <ListingDetailPage
            key={`listing:${overlays.length}:${overlay.id}`}
            listingId={overlay.id}
            me={me}
            onBack={back}
            onOpenProfile={openProfile}
            onMessage={message}
          />
        )}
        {overlay?.kind === "post" && (
          <PostPage
            key={`post:${overlays.length}:${overlay.id}`}
            postId={overlay.id}
            me={me}
            onBack={back}
            onOpenProfile={openProfile}
          />
        )}

        {/* The tab stays mounted under an overlay, keeping its scroll and search. */}
        <div className={cn("flex flex-col gap-4", overlay && "hidden")}>
          {tab === "feed" ? (
            <>
              <NewPostForm
                onCreated={(kind) => {
                  setListed(kind === "listing")
                  if (kind === "post") setFeedVersion((v) => v + 1)
                }}
              />
              {listed && (
                <p className="text-center text-sm text-muted-foreground">
                  Your listing is up. Find it in Listings.
                </p>
              )}
              <Feed
                key={feedVersion}
                onOpenProfile={openProfile}
                onOpenPost={openPost}
              />
            </>
          ) : tab === "listings" ? (
            <ListingsPage
              onOpenListing={openListing}
              onOpenProfile={openProfile}
            />
          ) : tab === "messages" ? (
            openChat ? (
              <ChatView
                key={openChat.id}
                className="h-[calc(100svh-6rem)] md:h-[calc(100svh-8rem)]"
                chatId={openChat.id}
                otherMember={openChat.otherMember}
                myUserId={userId}
                onBack={() => setOpenChat(null)}
                onRead={refreshUnread}
                onOpenProfile={openProfile}
              />
            ) : (
              <ChatList myUserId={userId} onOpen={setOpenChat} />
            )
          ) : (
            <ProfilePage
              key={username}
              username={username}
              myUserId={userId}
              onMessage={message}
              onOpenProfile={openProfile}
              onOpenPost={openPost}
              onFollowRequestsChanged={refreshFollowRequests}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { active: boolean }) {
  return (
    <Button
      variant={active ? "outline" : "ghost"}
      size="sm"
      aria-pressed={active}
      className={cn("gap-1.5", className)}
      {...props}
    />
  )
}

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span
      className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground"
      aria-label={`${count} ${label}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
