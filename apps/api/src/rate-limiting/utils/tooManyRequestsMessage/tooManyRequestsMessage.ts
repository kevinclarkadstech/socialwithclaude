/** The message for a refused request. */
export function tooManyRequestsMessage({ retryAfterSeconds }: { retryAfterSeconds: number }) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return retryAfterSeconds < 60
        ? "Too many requests. Try again in a moment."
        : `Too many requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
