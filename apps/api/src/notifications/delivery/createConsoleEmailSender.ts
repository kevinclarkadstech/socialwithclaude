import { rootLogger } from "../../observability";
import type { EmailSender } from "./types";

/**
 * For local development: logs each email instead of sending it, so you can
 * read sign-in codes in the API's log. It refuses to run in production, where
 * emails would go nowhere and their contents (sign-in codes) must never be logged.
 */
export function createConsoleEmailSender(): EmailSender {
    return {
        async send({ to, subject, text }) {
            rootLogger.info("Email (not sent: no email provider configured)", { to, subject, text });
        },
        assertCanSend() {
            if (process.env.NODE_ENV === "production") {
                throw new Error("No email provider is configured, so emails (sign-in codes) can't be sent");
            }
        },
    };
}
