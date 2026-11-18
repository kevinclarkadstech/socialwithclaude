import { errorReporter, rootLogger } from "../../../observability";
import { rateLimitRules } from "../../constants";
import type { RateLimitDecision, RateLimitRule } from "../../types";

let lastAlertedAt = 0;

/**
 * When the email budget refused a request, says so loudly, at most once an
 * hour per instance: either the app is busier than EMAIL_HOURLY_LIMIT
 * allows, or someone is trying to send a lot of email through it.
 */
export function alertWhenEmailBudgetReached(checks: { rule: RateLimitRule; decision: RateLimitDecision }[]) {
    const refused = checks.some(({ rule, decision }) => rule.name === rateLimitRules.emailBudget.name && !decision.allowed);
    if (!refused || Date.now() - lastAlertedAt < 60 * 60 * 1000) {
        return;
    }
    lastAlertedAt = Date.now();
    const message = `The email budget (EMAIL_HOURLY_LIMIT=${rateLimitRules.emailBudget.limit}) was reached: codes aren't being sent until the hour is up`;
    rootLogger.error(message);
    errorReporter.report({ error: new Error(message) });
}
