import { randomInt } from "node:crypto";
import { saveAccountDeletionCode } from "../../../data-access";
import { sendOtp } from "../../../notifications";
import { hashCode } from "../../utils/hashCode/hashCode";

/** A code lasts as long as a sign-in code. */
const expiresInMs = 5 * 60 * 1000;

/** Emails someone a new 6-digit code to confirm deleting their account with, replacing any earlier one. */
export async function sendAccountDeletionCode({ userId, email }: { userId: string; email: string }): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await saveAccountDeletionCode({ userId, codeHash: hashCode(code), expiresAt: new Date(Date.now() + expiresInMs) });
    await sendOtp({ email, code, type: "delete-account" });
}
