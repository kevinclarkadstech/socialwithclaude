import { z } from "zod";
import type { Maybe } from "./misc";

const AnalyticsEvent = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("signup_completed"),
        userId: z.string(),
        method: z.enum(["email", "oauth"]),
    }),
    z.object({
        type: z.literal("purchase"),
        orderId: z.string(),
        amountCents: z.number().int().positive(),
    }),
    z.object({
        type: z.literal("post_favorited"),
        postId: z.string(),
        userId: z.string(),
    }),
]);

// Single source of truth: TS type is inferred from the Zod schema, not maintained separately.
export type AnalyticsEvent = z.infer<typeof AnalyticsEvent>;

export function parseAnalyticsEvent(input: Maybe<AnalyticsEvent>): AnalyticsEvent {
    return AnalyticsEvent.parse(input);
}