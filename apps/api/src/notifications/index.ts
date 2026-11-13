import { emailSender } from "./delivery/emailSender";

/**
 * Notifications: what the API tells people, and how. Callers say what happened
 * (sendSignInCodeEmail); what each email says lives in templates/, and how it's
 * delivered in delivery/.
 */
export { sendSignInCodeEmail } from "./sendSignInCodeEmail";

/** Throws in production while emails can't really be sent (called at startup, so a deploy fails early). */
export function assertEmailCanBeSent() {
    emailSender.assertCanSend();
}
