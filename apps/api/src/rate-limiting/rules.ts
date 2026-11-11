import type { RateLimitRule } from "./types";

export const rateLimitRules = {
    /** Everything under /api/auth, per IP address. */
    auth: { name: "auth", limit: 60, windowSeconds: 60 },
    /** Sending a sign-in code, per IP address: each one is an email. */
    sendCodeByIp: { name: "send-code-ip", limit: 10, windowSeconds: 15 * 60 },
    /** Sending a sign-in code, per email address, so nobody's inbox can be flooded. */
    sendCodeByEmail: { name: "send-code-email", limit: 5, windowSeconds: 15 * 60 },
    /** Signing in with a code, per IP address. (Each code also allows only 3 tries.) */
    signInWithCode: { name: "sign-in-code", limit: 20, windowSeconds: 15 * 60 },
    /** tRPC queries, per signed-in user (or IP address when signed out). */
    queries: { name: "queries", limit: 600, windowSeconds: 60 },
    /** tRPC mutations, per signed-in user (or IP address when signed out). */
    mutations: { name: "mutations", limit: 60, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;
