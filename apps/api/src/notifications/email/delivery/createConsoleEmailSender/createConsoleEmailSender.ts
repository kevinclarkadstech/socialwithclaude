import { rootLogger } from "../../../../observability";
import type { EmailSender } from "../types";

/**
 * For local development: logs each email instead of sending it, so you can
 * read one-time codes in the API's log. It refuses to run in production, where
 * emails would go nowhere and their contents (one-time codes) must never be logged.
 */
export function createConsoleEmailSender(): EmailSender {
    return {
        async send({ to, subject, text }) {
            rootLogger.info("Email (not sent: EMAIL_PROVIDER is console)", { to, subject, text });
        },
        assertCanSend() {
            if (process.env.NODE_ENV === "production") {
                throw new Error("EMAIL_PROVIDER is console, so emails (one-time codes) would never be sent: set it to resend or mailgun");
            }
        },
    };
}
