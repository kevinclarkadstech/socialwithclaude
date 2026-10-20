import * as React from "react"
import { IconBan } from "@tabler/icons-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { type PersonSummary } from "@/lib/people"
import type { ChatMessage } from "@/hooks/use-chat-messages"
import { clockTime, dayLabel, fullDateTime, isSameDay } from "@/lib/time"

/** Messages from one sender this close together share a group. */
const GROUP_GAP_MS = 5 * 60 * 1000
/** Within this distance of the bottom counts as "at the bottom". */
const STICK_TO_BOTTOM_PX = 80

type Group = { senderId: string; messages: ChatMessage[] }
type Day = { date: string; groups: Group[] }

/** Oldest-first messages → days → runs of one sender close together. */
function groupMessages(messages: ChatMessage[]): Day[] {
  const days: Day[] = []
  for (const message of messages) {
    let day = days.at(-1)
    if (!day || !isSameDay(day.date, message.createdAt)) {
      day = { date: message.createdAt, groups: [] }
      days.push(day)
    }
    const group = day.groups.at(-1)
    const previous = group?.messages.at(-1)
    if (
      group &&
      previous &&
      group.senderId === message.senderId &&
      Date.parse(message.createdAt) - Date.parse(previous.createdAt) <
        GROUP_GAP_MS
    ) {
      group.messages.push(message)
    } else {
      day.groups.push({ senderId: message.senderId, messages: [message] })
    }
  }
  return days
}

/** What to do with one of our messages, from its actions. */
type MessageActions = {
  onRetry: (message: ChatMessage) => void
  onEdit: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
}

/**
 * A chat's messages, oldest at the top. Stays scrolled to the newest message
 * as they arrive (unless the reader has scrolled up), and keeps the reader's
 * place when older messages load above. Tapping one of your messages shows
 * Edit and Delete under it; deleted messages show as a placeholder.
 */
export function ChatMessagesList({
  messages,
  myUserId,
  otherMember,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onRetry,
  onEdit,
  onDelete,
  className,
}: MessageActions & {
  /** Oldest first. */
  messages: ChatMessage[]
  myUserId: string
  otherMember: PersonSummary
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  className?: string
}) {
  // The message whose actions are showing.
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const actions: MessageActions = {
    onRetry,
    onEdit: (message) => {
      setSelectedId(null)
      onEdit(message)
    },
    onDelete: (message) => {
      setSelectedId(null)
      onDelete(message)
    },
  }
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const atBottomRef = React.useRef(true)
  const previousRef = React.useRef<{
    firstId?: string
    lastId?: string
    scrollHeight: number
  }>({ scrollHeight: 0 })

  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const previous = previousRef.current
    const first = messages[0]
    const last = messages.at(-1)

    if (previous.firstId && first && first.id !== previous.firstId) {
      // Older messages were added above: keep the same messages in view.
      el.scrollTop += el.scrollHeight - previous.scrollHeight
    } else if (
      last?.id !== previous.lastId &&
      (atBottomRef.current || last?.senderId === myUserId)
    ) {
      // A new message at the bottom (or the first load): show it.
      el.scrollTop = el.scrollHeight
    }

    previousRef.current = {
      firstId: first?.id,
      lastId: last?.id,
      scrollHeight: el.scrollHeight,
    }
  }, [messages, myUserId])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX
  }

  const days = React.useMemo(() => groupMessages(messages), [messages])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn("flex flex-col overflow-y-auto px-4 py-4", className)}
      role="log"
      aria-live="polite"
    >
      {hasOlder && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onClick={onLoadOlder}
          disabled={loadingOlder}
        >
          {loadingOlder ? "Loading…" : "Load earlier messages"}
        </Button>
      )}

      {messages.length === 0 && (
        <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <UserAvatar person={otherMember} size="lg" />
          Say hi to @{otherMember.username}
        </div>
      )}

      {days.map((day) => (
        <section key={day.date} className="flex flex-col gap-3">
          <div className="mt-3 self-center text-xs font-medium text-muted-foreground">
            {dayLabel(day.date)}
          </div>
          {day.groups.map((group) => (
            <MessageGroup
              key={group.messages[0]!.id}
              group={group}
              mine={group.senderId === myUserId}
              otherMember={otherMember}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              actions={actions}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function MessageGroup({
  group,
  mine,
  otherMember,
  selectedId,
  onSelect,
  actions,
}: {
  group: Group
  mine: boolean
  otherMember: PersonSummary
  selectedId: string | null
  onSelect: (messageId: string) => void
  actions: MessageActions
}) {
  const last = group.messages.at(-1)!

  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {!mine && <UserAvatar person={otherMember} size="sm" />}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-0.5",
          mine ? "items-end" : "items-start"
        )}
      >
        {group.messages.map((message) => (
          <React.Fragment key={message.id}>
            <MessageBubble
              message={message}
              mine={mine}
              selected={message.id === selectedId}
              onSelect={onSelect}
            />
            {message.id === selectedId && (
              <MessageActionsRow message={message} actions={actions} />
            )}
          </React.Fragment>
        ))}
        <MessageMeta message={last} mine={mine} onRetry={actions.onRetry} />
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  mine,
  selected,
  onSelect,
}: {
  message: ChatMessage
  mine: boolean
  selected: boolean
  onSelect: (messageId: string) => void
}) {
  if (message.deleted) {
    return (
      <div
        title={fullDateTime(message.createdAt)}
        className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm text-muted-foreground italic ring-1 ring-foreground/10"
      >
        <IconBan className="size-3.5" aria-hidden="true" />
        Message deleted
      </div>
    )
  }

  const className = cn(
    "rounded-2xl px-3 py-2 text-left text-sm break-words whitespace-pre-wrap",
    mine
      ? "bg-primary text-primary-foreground"
      : "bg-card text-card-foreground ring-1 ring-foreground/5",
    message.status === "sending" && "opacity-60",
    message.status === "failed" && "bg-destructive/10 text-destructive",
    selected && "ring-3 ring-ring/50"
  )
  const content = (
    <>
      {message.body}
      {message.editedAt && (
        <span
          className="ml-1.5 text-[0.7rem] opacity-70"
          title={`Edited ${fullDateTime(message.editedAt)}`}
        >
          edited
        </span>
      )}
    </>
  )

  // Only our sent messages have actions.
  if (!mine || message.status !== "sent") {
    return (
      <div title={fullDateTime(message.createdAt)} className={className}>
        {content}
      </div>
    )
  }
  return (
    <button
      type="button"
      title={fullDateTime(message.createdAt)}
      className={cn(className, "cursor-pointer")}
      aria-expanded={selected}
      aria-label={`Your message: ${message.body}. Show actions`}
      onClick={() => onSelect(message.id)}
    >
      {content}
    </button>
  )
}

/** Edit / Delete under a selected message; Delete asks first. */
function MessageActionsRow({
  message,
  actions,
}: {
  message: ChatMessage
  actions: MessageActions
}) {
  const [confirming, setConfirming] = React.useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1 text-xs">
        Delete for everyone?
        <Button
          variant="destructive"
          size="xs"
          onClick={() => actions.onDelete(message)}
        >
          Delete
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    )
  }
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground"
        onClick={() => actions.onEdit(message)}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    </div>
  )
}

/** Under a group: the time, or for our last message its sending state. */
function MessageMeta({
  message,
  mine,
  onRetry,
}: {
  message: ChatMessage
  mine: boolean
  onRetry: (message: ChatMessage) => void
}) {
  if (mine && message.status === "failed") {
    return (
      <span className="text-xs text-destructive">
        Not sent ·{" "}
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => onRetry(message)}
        >
          Retry
        </button>
      </span>
    )
  }
  return (
    <span className="px-1 text-xs text-muted-foreground">
      {mine && message.status === "sending"
        ? "Sending…"
        : clockTime(message.createdAt)}
    </span>
  )
}
