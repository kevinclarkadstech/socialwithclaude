import { emailSender } from "./delivery/emailSender";
import { signInCodeEmail, type SignInCodeType } from "./templates/signInCodeEmail";

/** Emails someone a one-time code (to sign in, or to confirm their address). */
export async function sendSignInCodeEmail({ email, code, type }: { email: string; code: string; type: SignInCodeType }) {
    await emailSender.send({ to: email, ...signInCodeEmail({ code, type }) });
}
