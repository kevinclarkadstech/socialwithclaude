/**
 * `map` over `items` with at most `limit` calls running at once, e.g. to
 * publish several photos without opening a connection per photo. Results
 * keep the items' order. The first rejection rejects the whole call (calls
 * already running finish on their own).
 */
export async function mapWithConcurrency<T, R>({ items, limit, map }: {
    items: readonly T[];
    limit: number;
    map: (item: T, index: number) => Promise<R>;
}): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    async function work() {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await map(items[index]!, index);
        }
    }
    const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => work());
    await Promise.all(workers);
    return results;
}
