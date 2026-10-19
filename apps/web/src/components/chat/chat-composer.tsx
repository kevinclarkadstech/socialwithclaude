import * as React from "react"
import { IconSend } from "@tabler/icons-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

/** Same limit as the API (chats.sendMessage). */
const MAX_LENGTH = 2000

/** Message box: Enter sends, Shift+Enter adds a line. */
export function ChatComposer({
  onSend,
  disabled,
  className,
}: {
  onSend: (body: string) => void
  disabled?: boolean
  className?: string
}) {
  const [body, setBody] = React.useState("")
  const text = body.trim()

  function send() {
    if (!text || disabled) return
    onSend(text)
    setBody("")
  }

  return (
    <form
      className={cn("flex items-end gap-2", className)}
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
          }
        }}
        placeholder="Message"
        aria-label="Message"
        rows={1}
        maxLength={MAX_LENGTH}
        disabled={disabled}
        className="max-h-40 min-h-9 py-2"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!text || disabled}
        aria-label="Send"
      >
        <IconSend />
      </Button>
    </form>
  )
}
