import type { EmailMessage } from "../delivery/types";

/** better-auth's reasons for sending a one-time code. */
export type SignInCodeType = "sign-in" | "email-verification" | "forget-password" | (string & {});

const subjects: Record<string, string> = {
    "sign-in": "Your sign-in code",
    "email-verification": "Confirm your email",
    "forget-password": "Your account recovery code",
};

/** The email with a one-time code: what it says, as text and HTML. */
export function signInCodeEmail({ code, type }: { code: string; type: SignInCodeType }): Omit<EmailMessage, "to"> {
    const subject = subjects[type] ?? subjects["sign-in"]!;
    return {
        subject,
        text: `Your code is ${code}. It expires in 5 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
        html: `<p>Your code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 5 minutes.</p><p style="color:#666">If you didn't ask for it, you can ignore this email.</p>`,
    };
}
