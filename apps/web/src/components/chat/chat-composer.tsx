import * as React from "react"
import { IconCheck, IconPencil, IconSend, IconX } from "@tabler/icons-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

/** Same limit as the API (chats.sendMessage / editMessage). */
const MAX_LENGTH = 2000

/**
 * Message box: Enter sends, Shift+Enter adds a line. With `editing`, it
 * starts with that text and saves an edit instead; Escape cancels. (Remount
 * it with a new `key` to switch between sending and editing.)
 */
export function ChatComposer({
  onSend,
  editing,
  disabled,
  className,
}: {
  onSend: (body: string) => void
  /** Editing an existing message: its text, and how to stop editing. */
  editing?: { body: string; onCancel: () => void }
  disabled?: boolean
  className?: string
}) {
  const [body, setBody] = React.useState(editing?.body ?? "")
  const text = body.trim()
  const unchanged = editing !== undefined && text === editing.body.trim()

  function send() {
    if (!text || disabled) return
    if (unchanged) {
      editing.onCancel()
      return
    }
    onSend(text)
    setBody("")
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {editing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconPencil className="size-3.5" aria-hidden="true" />
          Editing message
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto"
            onClick={editing.onCancel}
            aria-label="Cancel editing"
          >
            <IconX />
          </Button>
        </div>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              send()
            } else if (event.key === "Escape" && editing) {
              event.preventDefault()
              editing.onCancel()
            }
          }}
          placeholder="Message"
          aria-label={editing ? "Edit message" : "Message"}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          autoFocus={editing !== undefined}
          className="max-h-40 min-h-9 py-2"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text || disabled}
          aria-label={editing ? "Save edit" : "Send"}
        >
          {editing ? <IconCheck /> : <IconSend />}
        </Button>
      </form>
    </div>
  )
}
