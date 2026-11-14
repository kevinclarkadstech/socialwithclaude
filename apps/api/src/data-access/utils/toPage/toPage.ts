import type { Page } from "@myapp/shared/types";

/**
 * Turns `limit + 1` fetched rows into a page: if the extra row came back
 * there's another page, and its cursor is the last item's.
 */
export function toPage<T>(rows: T[], limit: number, getCursor: (item: T) => string): Page<T> {
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? getCursor(items[items.length - 1]!) : null };
}
