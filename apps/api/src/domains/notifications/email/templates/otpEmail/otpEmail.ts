import type { EmailMessage } from "../../delivery/types";

/** Why a one-time code is sent: better-auth's reasons, and confirming an account deletion. */
export type OtpType = "sign-in" | "email-verification" | "forget-password" | "delete-account" | (string & {});

const subjects: Record<string, string> = {
    "sign-in": "Your sign-in code",
    "email-verification": "Confirm your email",
    "forget-password": "Your account recovery code",
    "delete-account": "Your code to delete your account",
};

/** The email with a one-time code: what it says, as text and HTML. */
export function otpEmail({ code, type }: { code: string; type: OtpType }): Omit<EmailMessage, "to"> {
    const subject = subjects[type] ?? subjects["sign-in"]!;
    return {
        subject,
        text: `Your code is ${code}. It expires in 5 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
        html: `<p>Your code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 5 minutes.</p><p style="color:#666">If you didn't ask for it, you can ignore this email.</p>`,
    };
}
