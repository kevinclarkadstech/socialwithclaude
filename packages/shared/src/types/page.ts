import { z } from "zod";

/** One page of a list. Pass `nextCursor` back as `cursor` for the next page; null when there are no more. */
export type Page<T> = { items: T[]; nextCursor: string | null };

/** Schema for a page of `item`. */
export const pageSchema = <T extends z.ZodType>(item: T) =>
    z.object({ items: z.array(item), nextCursor: z.string().nullable() });

/** Input shared by paged queries: where to continue, and how many (1–100, default 20). */
export const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(20),
});

/** Fetch rounds per page before returning a short page (heavy filtering only). */
const MAX_FETCH_ROUNDS = 3;

/**
 * Builds a page of `limit` visible items, fetching more rows until it has
 * enough or there are none left. Each round fetches 1.5x the page size, so one
 * round is almost always enough; after MAX_FETCH_ROUNDS it returns what it has.
 *
 * Cursor: if more than `limit` were found, the page ends at the last item
 * returned (the extra visible rows are fetched again next page). Otherwise it
 * continues after the last row *scanned*, so hidden rows aren't fetched again.
 */
export async function fillVisiblePage<T>(
    fetchPage: (cursor: string | null, limit: number) => Promise<Page<T>>,
    { cursor, limit }: { cursor?: string | null; limit: number },
    isVisible: (item: T) => boolean,
    cursorOf: (item: T) => string,
): Promise<Page<T>> {
    const visible: T[] = [];
    let next = cursor ?? null;

    for (let round = 0; round < MAX_FETCH_ROUNDS; round++) {
        const page = await fetchPage(next, Math.ceil(limit * 1.5));
        visible.push(...page.items.filter(isVisible));
        next = page.nextCursor;
        if (visible.length >= limit || !next) break;
    }

    if (visible.length > limit) {
        const items = visible.slice(0, limit);
        return { items, nextCursor: cursorOf(items[items.length - 1]!) };
    }
    return { items: visible, nextCursor: next };
}
