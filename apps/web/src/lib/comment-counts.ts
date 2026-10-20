/**
 * Comment counts changed this session, so a post's card shows the right
 * count after commenting on its page. Holds the latest known count (not a
 * difference), so it stays right when cards reload from the server.
 */
type Listener = () => void;

const countById = new Map<string, number>();
const listeners = new Set<Listener>();

/** The post's comment count if it changed this session, else undefined. */
export function getCommentCountOverride(postId: string): number | undefined {
    return countById.get(postId);
}

/**
 * Adds `delta` to the post's count: the count changed this session if there
 * is one, else `serverCount` (the post's count as last fetched).
 */
export function adjustCommentCount(postId: string, serverCount: number, delta: number) {
    const current = countById.get(postId) ?? serverCount;
    countById.set(postId, Math.max(0, current + delta));
    for (const listener of listeners) listener();
}

export function subscribeToCommentCounts(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
