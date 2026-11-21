import type { EmailSender } from "../types";
import { deliveryError } from "../deliveryError/deliveryError";

const apiHosts = { us: "https://api.mailgun.net", eu: "https://api.eu.mailgun.net" } as const;

/** Sends through Mailgun's REST API (https://documentation.mailgun.com/docs/mailgun/api-reference/). Throws if Mailgun refuses. */
export function createMailgunEmailSender({ apiKey, domain, region, from, fetch = (url, init) => globalThis.fetch(url, init) }: {
    apiKey: string;
    // The sending domain as set up in Mailgun, e.g. "mg.example.com".
    domain: string;
    region: keyof typeof apiHosts;
    from: string;
    // Swappable for tests.
    fetch?: (url: string, init: RequestInit) => Promise<Response>;
}): EmailSender {
    return {
        async send({ to, subject, text, html }) {
            const form = new URLSearchParams({ from, to, subject, text });
            if (html) {
                form.set("html", html);
            }
            const response = await fetch(`${apiHosts[region]}/v3/${encodeURIComponent(domain)}/messages`, {
                method: "POST",
                headers: { authorization: `Basic ${btoa(`api:${apiKey}`)}`, "content-type": "application/x-www-form-urlencoded" },
                body: form,
            });
            if (!response.ok) {
                throw await deliveryError({ provider: "Mailgun", response });
            }
        },
        assertCanSend() {},
    };
}
