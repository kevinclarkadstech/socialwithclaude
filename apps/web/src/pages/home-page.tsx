import * as React from "react"
import { cn } from "cn"

import { ChatList, type OpenChat } from "@/components/chat/chat-list"
import { ChatView } from "@/components/chat/chat-view"
import { Feed } from "@/components/feed"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { signOut } from "@/lib/auth"

type Tab = "feed" | "messages"

/** The unread badge is refreshed this often. */
const UNREAD_POLL_MS = 15_000

/** Signed in with a profile: Feed and Messages. */
export function HomePage({
  userId,
  username,
}: {
  userId: string
  username: string
}) {
  const [tab, setTab] = React.useState<Tab>("feed")
  const [openChat, setOpenChat] = React.useState<OpenChat | null>(null)
  const { count: unread, refresh: refreshUnread } = useUnreadCount()

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 md:py-8">
        <div className="flex items-center gap-1 text-sm">
          <TabButton active={tab === "feed"} onClick={() => setTab("feed")}>
            Feed
          </TabButton>
          <TabButton
            active={tab === "messages"}
            onClick={() => setTab("messages")}
          >
            Messages
            {unread > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </TabButton>
          <span className="ml-auto truncate text-muted-foreground">
            @{username}
          </span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>

        {tab === "feed" && <Feed />}
        {tab === "messages" &&
          (openChat ? (
            <ChatView
              key={openChat.id}
              className="h-[calc(100svh-6rem)] md:h-[calc(100svh-8rem)]"
              chatId={openChat.id}
              otherMember={openChat.otherMember}
              myUserId={userId}
              onBack={() => setOpenChat(null)}
              onRead={refreshUnread}
            />
          ) : (
            <ChatList myUserId={userId} onOpen={setOpenChat} />
          ))}
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

/**
 * Unread messages across chats, for the Messages badge. Refreshed on a timer,
 * and by `refresh` when a chat is read.
 */
function useUnreadCount() {
  const [count, setCount] = React.useState(0)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    const load = () =>
      api.chats.getMyUnreadCount
        .query()
        .then((n) => !cancelled && setCount(n))
        .catch(() => {})
    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, UNREAD_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [version])

  const refresh = React.useCallback(() => setVersion((v) => v + 1), [])
  return { count, refresh }
}
