import { emailSender } from "../../email/delivery/emailSender/emailSender";
import { otpEmail, type OtpType } from "../../email/templates/otpEmail/otpEmail";

/** Sends someone a one-time code (to sign in, confirm their address or recover their account). It goes by email. */
export async function sendOtp({ email, code, type }: { email: string; code: string; type: OtpType }) {
    await emailSender.send({ to: email, ...otpEmail({ code, type }) });
}
