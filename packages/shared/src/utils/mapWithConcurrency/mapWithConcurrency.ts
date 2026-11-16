/**
 * Runs `run` over `items`, at most `limit` at a time, settling each like
 * Promise.allSettled: one that fails doesn't stop the rest. Results keep the
 * items' order. A caller that needs all to succeed checks for "rejected".
 */
export async function mapWithConcurrency<T, R>({ items, limit, run }: {
    items: readonly T[];
    limit: number;
    run: (item: T, index: number) => Promise<R>;
}): Promise<PromiseSettledResult<R>[]> {
    const results = new Array<PromiseSettledResult<R>>(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const index = next;
            next += 1;
            try {
                results[index] = { status: "fulfilled", value: await run(items[index]!, index) };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
    return results;
}

/** The values of settled results, or throws the first failure (after every item has run). */
export function valuesOrThrow<R>(results: PromiseSettledResult<R>[]): R[] {
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failed) {
        throw failed.reason;
    }
    return results.map((result) => (result as PromiseFulfilledResult<R>).value);
}
