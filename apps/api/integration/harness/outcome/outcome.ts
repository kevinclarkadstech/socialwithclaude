import { TRPCError } from "@trpc/server";

/**
 * How a call ended: "OK", or the tRPC error code it failed with (e.g.
 * "NOT_FOUND", "FORBIDDEN"), so tests read like the HTTP status a client sees.
 */
export async function outcome(call: Promise<unknown>): Promise<string> {
    try {
        await call;
        return "OK";
    } catch (error) {
        if (error instanceof TRPCError) {
            return error.code;
        }
        throw error;
    }
}

/** The value of a call that must succeed. */
export async function valueOf<T>(call: Promise<{ ok: true; value: T } | { ok: false; error: unknown }>): Promise<T> {
    const result = await call;
    if (!result.ok) {
        throw new Error(`Expected success, got ${JSON.stringify(result.error)}`);
    }
    return result.value;
}
