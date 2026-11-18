import { serverConfig } from "../../config";
import type { RateLimitRule } from "../types";

/** The key emailBudget is counted under: one counter for the whole API. */
export const emailBudgetKey = "all";

export const rateLimitRules = {
    /** Everything under /api/auth, per IP address. */
    auth: { name: "auth", limit: 60, windowSeconds: 60 },
    // Every rule that guards sending an email refuses while the counters can't be
    // reached: unlimited email would cost money and the sending domain's reputation.
    /** Sending a sign-in code, per IP address: each one is an email. */
    sendCodeByIp: { name: "send-code-ip", limit: 10, windowSeconds: 15 * 60, whenUnavailable: "refuse" },
    sendCodeByIpDaily: { name: "send-code-ip-day", limit: 30, windowSeconds: 24 * 60 * 60, whenUnavailable: "refuse" },
    /** Sending a sign-in code, per email address, so nobody's inbox can be flooded. */
    sendCodeByEmail: { name: "send-code-email", limit: 5, windowSeconds: 15 * 60, whenUnavailable: "refuse" },
    sendCodeByEmailDaily: { name: "send-code-email-day", limit: 10, windowSeconds: 24 * 60 * 60, whenUnavailable: "refuse" },
    /** Sending an account deletion code, per user. */
    accountDeletionCode: { name: "account-deletion-code", limit: 3, windowSeconds: 15 * 60, whenUnavailable: "refuse" },
    accountDeletionCodeDaily: { name: "account-deletion-code-day", limit: 10, windowSeconds: 24 * 60 * 60, whenUnavailable: "refuse" },
    /**
     * Every email the API sends, all together (key "all"): a ceiling a bot
     * spread over many addresses and IPs can't get past, so it can't use up
     * the provider's quota or the domain's reputation. Set by EMAIL_HOURLY_LIMIT.
     */
    emailBudget: { name: "email-budget", limit: serverConfig.EMAIL_HOURLY_LIMIT, windowSeconds: 60 * 60, whenUnavailable: "refuse" },
    /** Signing in with a code, per IP address. (Each code also allows only 3 tries.) */
    signInWithCode: { name: "sign-in-code", limit: 20, windowSeconds: 15 * 60 },
    /** tRPC queries, per signed-in user (or IP address when signed out). */
    queries: { name: "queries", limit: 600, windowSeconds: 60 },
    /** tRPC mutations, per signed-in user (or IP address when signed out). */
    mutations: { name: "mutations", limit: 60, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Extra limits for particular tRPC procedures, on top of the query or
 * mutation limit: counted per caller, or under a fixed `sharedKey` for one
 * counter across everyone (the email budget, for procedures that send email).
 */
export const procedureRateLimitRules: Record<string, { rule: RateLimitRule; sharedKey?: string }[]> = {
    "auth.sendAccountDeletionCode": [
        { rule: rateLimitRules.accountDeletionCode },
        { rule: rateLimitRules.accountDeletionCodeDaily },
        { rule: rateLimitRules.emailBudget, sharedKey: emailBudgetKey },
    ],
};
