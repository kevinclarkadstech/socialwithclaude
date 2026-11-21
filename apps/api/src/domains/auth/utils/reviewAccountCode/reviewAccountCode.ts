/**
 * The sign-in code for the app stores' review account: the fixed code when
 * `email` is the review account's (REVIEW_ACCOUNT_EMAIL, any case) and it's a
 * sign-in, otherwise null (a normal random code is made and emailed).
 * Reviewers can't receive the account's emails, so App Store Connect and Play
 * Console are given the email and this code instead.
 */
export function reviewAccountCode({ email, type, reviewAccount }: {
    email: string;
    type: string;
    reviewAccount: { email: string; code: string } | null;
}): string | null {
    if (!reviewAccount || type !== "sign-in") {
        return null;
    }
    return email.trim().toLowerCase() === reviewAccount.email.trim().toLowerCase() ? reviewAccount.code : null;
}
