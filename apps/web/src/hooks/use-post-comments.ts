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
}

export type CommentAuthor = ServerComment["author"]

/** "top" is shown as Best: highest score (upvotes minus downvotes) first. */
export type CommentSort = "top" | "newest" | "oldest"
export type Vote = -1 | 0 | 1

type Loaded = { sort: CommentSort } & (
  | { status: "not-found" }
  | { status: "error" }
  | {
      status: "ready"
      /** In `sort` order, after our new comments (newest of ours first). */
      comments: PostComment[]
      nextCursor: string | null
    }
)
type State = { status: "loading" } | Loaded

const ulid = monotonicFactory()

const sent = (c: ServerComment): PostComment => ({ ...c, status: "sent" })

/** The comment's counts after the viewer's vote changes to `value`. */
function withVote(comment: PostComment, value: Vote): PostComment {
  const previous = comment.myVote
  const numUpvotes =
    comment.numUpvotes + Number(value === 1) - Number(previous === 1)
  const numDownvotes =
    comment.numDownvotes + Number(value === -1) - Number(previous === -1)
  return {
    ...comment,
    myVote: value,
    numUpvotes,
    numDownvotes,
    score: numUpvotes - numDownvotes,
  }
}

/**
 * A post's comments in `sort` order, a page at a time, with optimistic
 * create / edit / delete / vote. Your new comments show at the top whatever
 * the order. Creates use a client id, so retrying a failed one never doubles
 * it. Comment counts elsewhere are kept in step, starting from
 * `numComments` (the post's count when it was fetched).
 */
export function usePostComments(
  postId: string,
  sort: CommentSort,
  numComments: number,
  me: PersonSummary & { userId: string }
) {
  const [loaded, setState] = React.useState<Loaded | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  // Votes on a comment are sent one at a time, in order.
  const voteQueues = React.useRef(new Map<string, Promise<unknown>>())

  React.useEffect(() => {
    let cancelled = false
    api.posts.getPostComments
      .query({ postId, sort })
      .then((page) => {
        if (cancelled) return
        setState({
          sort,
          status: "ready",
          comments: page.items.map(sent),
          nextCursor: page.nextCursor,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          sort,
          status:
            apiErrorMessage(err) === "POST_NOT_FOUND" ? "not-found" : "error",
        })
      })
    return () => {
      cancelled = true
    }
  }, [postId, sort])

  // Comments for another order are stale until the new ones arrive.
  const state: State = loaded?.sort === sort ? loaded : { status: "loading" }

  const patch = React.useCallback(
    (id: string, change: (c: PostComment) => PostComment | null) =>
      setState((prev) => {
        if (prev?.status !== "ready") return prev
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
        sort,
        cursor: state.nextCursor,
      })
      setState((prev) => {
        if (prev?.status !== "ready" || prev.sort !== sort) return prev
        // Skip ones already shown: our new comments, or (for Best) ones
        // whose score moved them across pages.
        const shown = new Set(prev.comments.map((c) => c.id))
        return {
          ...prev,
          comments: [
            ...prev.comments,
            ...page.items.filter((c) => !shown.has(c.id)).map(sent),
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
    }
    setState({ ...state, comments: [comment, ...state.comments] })
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
        if (prev?.status !== "ready") return prev
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

  /**
   * Sets your vote: 1 (up), -1 (down) or 0 (none). Shows right away; if the
   * request fails, the vote goes back unless you've voted again since.
   */
  function vote(comment: PostComment, value: Vote) {
    const previous = comment.myVote as Vote
    if (value === previous) return
    patch(comment.id, (c) => withVote(c, value))
    const queues = voteQueues.current
    const request = (queues.get(comment.id) ?? Promise.resolve())
      .catch(() => {})
      .then(() => api.posts.voteOnPostComment.mutate({ id: comment.id, value }))
      .catch(() =>
        patch(comment.id, (c) =>
          c.myVote === value ? withVote(c, previous) : c
        )
      )
      .finally(() => {
        if (queues.get(comment.id) === request) queues.delete(comment.id)
      })
    queues.set(comment.id, request)
  }

  return { state, loadingMore, loadMore, create, retry, update, remove, vote }
}
