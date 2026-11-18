/**
 * The error a provider's refusal becomes: its name and HTTP status, and its
 * own short explanation, never the message's contents (one-time codes).
 */
export async function deliveryError({ provider, response }: { provider: string; response: Response }): Promise<Error> {
    const body = await response.text().catch(() => "");
    let reason = "";
    try {
        const parsed = JSON.parse(body) as { message?: unknown };
        reason = typeof parsed.message === "string" ? `: ${parsed.message.slice(0, 200)}` : "";
    } catch {
        // Not JSON: leave the reason out rather than echo an unknown body.
    }
    return new Error(`${provider} didn't send an email (HTTP ${response.status})${reason}`);
}
