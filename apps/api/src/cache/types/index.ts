/**
 * What the API needs from a cache. Only this interface is used outside
 * src/cache, so the store behind it (Redis today) can be swapped by writing
 * another implementation. It holds what's used so far; get/set/delete come
 * when something caches data.
 */
export interface Cache {
    /**
     * Adds 1 to the counter at `key`, which expires `windowSeconds` after its
     * first increment. Returns the count and how many seconds are left.
     */
    increment(args: { key: string; windowSeconds: number }): Promise<{ count: number; secondsLeft: number }>;
    /** Whether the cache answers, for the readiness check. */
    isReachable(): Promise<boolean>;
    /** Closes the connection on shutdown. */
    close(): Promise<void>;
}
