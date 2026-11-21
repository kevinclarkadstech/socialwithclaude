import type { EmailSender } from "../types";
import { deliveryError } from "../deliveryError/deliveryError";

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). Throws if Resend refuses. */
export function createResendEmailSender({ apiKey, from, fetch = (url, init) => globalThis.fetch(url, init) }: {
    apiKey: string;
    from: string;
    // Swappable for tests.
    fetch?: (url: string, init: RequestInit) => Promise<Response>;
}): EmailSender {
    return {
        async send({ to, subject, text, html }) {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
                body: JSON.stringify({ from, to: [to], subject, text, ...(html && { html }) }),
            });
            if (!response.ok) {
                throw await deliveryError({ provider: "Resend", response });
            }
        },
        assertCanSend() {},
    };
}
