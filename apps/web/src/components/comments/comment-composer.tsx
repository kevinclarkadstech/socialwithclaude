import * as React from "react"
import { COMMENT_BODY_MAX } from "@myapp/shared/types/posts"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

/**
 * Comment text box with submit / cancel buttons, for new comments and edits.
 * Enter submits, Shift+Enter adds a line, Escape cancels (when it can).
 */
export function CommentComposer({
  initialBody = "",
  submitLabel,
  placeholder = "Add a comment",
  onSubmit,
  onCancel,
  autoFocus,
  textareaRef,
  className,
}: {
  initialBody?: string
  submitLabel: string
  placeholder?: string
  /** Clears the box unless it returns false. */
  onSubmit: (body: string) => boolean | void
  onCancel?: () => void
  autoFocus?: boolean
  textareaRef?: React.Ref<HTMLTextAreaElement>
  className?: string
}) {
  const [body, setBody] = React.useState(initialBody)
  const text = body.trim()

  function submit() {
    if (!text) return
    if (onSubmit(text) !== false) setBody("")
  }

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            submit()
          } else if (event.key === "Escape" && onCancel) {
            event.preventDefault()
            onCancel()
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={1}
        maxLength={COMMENT_BODY_MAX}
        autoFocus={autoFocus}
        className="max-h-40 min-h-9 py-2"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={!text || text === initialBody.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
