import { IconArrowLeft } from "@tabler/icons-react"
import { cn } from "cn"

import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatMessagesList } from "@/components/chat/chat-messages-list"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { displayName, type PersonSummary } from "@/lib/people"
import { useChatMessages } from "@/hooks/use-chat-messages"

/** One open chat: header, messages and the message box. */
export function ChatView({
  chatId,
  otherMember,
  myUserId,
  onBack,
  onRead,
  onOpenProfile,
  className,
}: {
  chatId: string
  otherMember: PersonSummary
  myUserId: string
  onBack: () => void
  /** Called after the chat is marked read (to refresh unread counts). */
  onRead?: () => void
  /** Open the other member's profile from the header. */
  onOpenProfile?: (username: string) => void
  className?: string
}) {
  const { state, loadingOlder, loadOlder, send, retry } = useChatMessages(
    chatId,
    myUserId,
    onRead
  )

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-4xl bg-muted/50 ring-1 ring-foreground/5",
        className
      )}
    >
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back to messages"
        >
          <IconArrowLeft />
        </Button>
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
          onClick={() => onOpenProfile?.(otherMember.username)}
          disabled={!onOpenProfile}
          aria-label={`View @${otherMember.username}'s profile`}
        >
          <UserAvatar person={otherMember} />
          <span className="flex min-w-0 flex-col text-sm leading-tight">
            <span className="truncate font-medium">
              {displayName(otherMember)}
            </span>
            <span className="truncate text-muted-foreground">
              @{otherMember.username}
            </span>
          </span>
        </button>
      </header>

      {state.status === "ready" ? (
        <ChatMessagesList
          className="min-h-0 flex-1"
          messages={state.messages}
          myUserId={myUserId}
          otherMember={otherMember}
          hasOlder={state.olderCursor !== null}
          loadingOlder={loadingOlder}
          onLoadOlder={loadOlder}
          onRetry={retry}
        />
      ) : (
        <p className="m-auto p-6 text-center text-sm text-muted-foreground">
          {state.status === "not-found"
            ? "This chat isn't available."
            : state.status === "error"
              ? "Couldn't load messages."
              : null}
        </p>
      )}

      <div className="border-t bg-card p-3">
        <ChatComposer onSend={send} disabled={state.status !== "ready"} />
      </div>
    </div>
  )
}
