import * as React from "react"
import { monotonicFactory } from "ulid"

import { api, apiErrorMessage } from "@/lib/api"
import { adjustCommentCount } from "@/lib/comment-counts"
import type { PersonSummary } from "@/lib/people"

type ServerComment = Awaited<
  ReturnType<typeof api.posts.getPostComments.query>
>["items"][number]

/** A comment as shown: from the server, or one of ours still sending/failed. */
export type PostComment = ServerComment & {
  status: "sent" | "sending" | "failed"
  /** Added here this session (may not be in the loaded pages yet). */
  local?: boolean
}

export type CommentAuthor = ServerComment["author"]

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | {
      status: "ready"
      /** Oldest first; our new comments at the end. */
      comments: PostComment[]
      nextCursor: string | null
    }

const ulid = monotonicFactory()

const sent = (c: ServerComment): PostComment => ({ ...c, status: "sent" })

/**
 * A post's comments, oldest first, a page at a time, with optimistic
 * create / edit / delete. Creates use a client id, so retrying a failed one
 * never doubles it. Comment counts elsewhere are kept in step, starting
 * from `numComments` (the post's count when it was fetched).
 */
export function usePostComments(
  postId: string,
  numComments: number,
  me: PersonSummary & { userId: string }
) {
  const [state, setState] = React.useState<State>({ status: "loading" })
  const [loadingMore, setLoadingMore] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    api.posts.getPostComments
      .query({ postId })
      .then((page) => {
        if (cancelled) return
        setState({
          status: "ready",
          comments: page.items.map(sent),
          nextCursor: page.nextCursor,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          status:
            apiErrorMessage(err) === "POST_NOT_FOUND" ? "not-found" : "error",
        })
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  const patch = React.useCallback(
    (id: string, change: (c: PostComment) => PostComment | null) =>
      setState((prev) => {
        if (prev.status !== "ready") return prev
        return {
          ...prev,
          comments: prev.comments.flatMap((c) =>
            c.id === id ? (change(c) ?? []) : c
          ),
        }
      }),
    []
  )

  async function loadMore() {
    if (state.status !== "ready" || !state.nextCursor) return
    setLoadingMore(true)
    try {
      const page = await api.posts.getPostComments.query({
        postId,
        cursor: state.nextCursor,
      })
      setState((prev) => {
        if (prev.status !== "ready") return prev
        const loaded = new Set(prev.comments.map((c) => c.id))
        const fetched = new Set(page.items.map((c) => c.id))
        return {
          status: "ready",
          // Our new comments stay last until their page arrives.
          comments: [
            ...prev.comments.filter((c) => !c.local),
            ...page.items.filter((c) => !loaded.has(c.id)).map(sent),
            ...prev.comments.filter((c) => c.local && !fetched.has(c.id)),
          ],
          nextCursor: page.nextCursor,
        }
      })
    } finally {
      setLoadingMore(false)
    }
  }

  async function send(id: string, body: string) {
    try {
      await api.posts.createPostComment.mutate({ id, postId, body })
      patch(id, (c) => ({ ...c, status: "sent" }))
      adjustCommentCount(postId, numComments, 1)
    } catch {
      patch(id, (c) => ({ ...c, status: "failed" }))
    }
  }

  function create(body: string) {
    if (state.status !== "ready") return
    const id = ulid()
    const now = new Date().toISOString()
    const author: CommentAuthor = {
      userId: me.userId,
      username: me.username,
      firstName: me.firstName,
      lastName: me.lastName,
      avatarUrl: me.avatarUrl,
    }
    const comment: PostComment = {
      id,
      body,
      author,
      createdAt: now,
      updatedAt: now,
      numUpvotes: 0,
      numDownvotes: 0,
      score: 0,
      myVote: 0,
      status: "sending",
      local: true,
    }
    setState({ ...state, comments: [...state.comments, comment] })
    void send(id, body)
  }

  function retry(comment: PostComment) {
    patch(comment.id, (c) => ({ ...c, status: "sending" }))
    void send(comment.id, comment.body)
  }

  /** Rejects (and restores the old text) if the edit fails. */
  async function update(comment: PostComment, body: string) {
    patch(comment.id, (c) => ({
      ...c,
      body,
      updatedAt: new Date().toISOString(),
    }))
    try {
      await api.posts.updatePostComment.mutate({ id: comment.id, body })
    } catch (err) {
      patch(comment.id, (c) => ({
        ...c,
        body: comment.body,
        updatedAt: comment.updatedAt,
      }))
      throw err
    }
  }

  /** Rejects (and puts the comment back) if the delete fails. */
  async function remove(comment: PostComment) {
    if (comment.status === "failed") {
      // Never reached the server: just drop it.
      patch(comment.id, () => null)
      return
    }
    const index =
      state.status === "ready"
        ? state.comments.findIndex((c) => c.id === comment.id)
        : -1
    patch(comment.id, () => null)
    try {
      await api.posts.deletePostComment.mutate({ id: comment.id })
      adjustCommentCount(postId, numComments, -1)
    } catch (err) {
      setState((prev) => {
        if (prev.status !== "ready") return prev
        const comments = [...prev.comments]
        comments.splice(
          index < 0 ? comments.length : Math.min(index, comments.length),
          0,
          comment
        )
        return { ...prev, comments }
      })
      throw err
    }
  }

  return { state, loadingMore, loadMore, create, retry, update, remove }
}
