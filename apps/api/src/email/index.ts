import { rootLogger } from "../observability";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Throws in production: no email provider is set up yet, so sign-in codes
 * could only be logged, and codes must never end up in production logs.
 * Called at startup, so a deploy fails right away instead of at sign-in.
 */
export function assertEmailCanBeSent() {
    if (isProduction) {
        throw new Error("No email provider is configured, so sign-in codes can't be sent");
    }
}

/** Sends a one-time sign-in code. Until an email provider is set up, it's logged instead. */
export async function sendSignInCode({ email, otp, type }: { email: string; otp: string; type: string }) {
    rootLogger.info("Sign-in code (not emailed: no email provider configured)", { email, otp, type });
}
