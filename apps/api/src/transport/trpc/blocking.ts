import { getBlockListRows } from "../../data-access";
import type { TRPCContext } from "./context";

/** Who the caller blocks, and who blocks them. Blocking hides content both ways. */
export type UserBlockList = {
    blocking: ReadonlySet<string>;
    blockedBy: ReadonlySet<string>;
};

const emptyBlockList: UserBlockList = { blocking: new Set(), blockedBy: new Set() };
const blockListByRequest = new WeakMap<TRPCContext, Promise<UserBlockList>>();

/**
 * The caller's block list, loaded on first use and cached for the rest of the
 * request. Empty when signed out.
 */
export function getUserBlockList(ctx: TRPCContext): Promise<UserBlockList> {
    const userId = ctx.user?.id;
    if (!userId) return Promise.resolve(emptyBlockList);

    let blockList = blockListByRequest.get(ctx);
    if (!blockList) {
        blockList = getBlockListRows(ctx.db, userId).then(({ blocking, blockedBy }) => ({
            blocking: new Set(blocking),
            blockedBy: new Set(blockedBy),
        }));
        blockListByRequest.set(ctx, blockList);
    }
    return blockList;
}

/** True if either user has blocked the other. */
export function isBlocked(blockList: UserBlockList, userId: string) {
    return blockList.blocking.has(userId) || blockList.blockedBy.has(userId);
}

type Page<T> = { items: T[]; nextCursor: string | null };

/** Fetch rounds per page before returning a short page (heavy blocking only). */
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
