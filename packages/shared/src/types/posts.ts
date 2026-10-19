import { z } from "zod";

export const listingPriceTypes = ["fixed", "negotiable", "free", "multiple"] as const;
export const listingConditions = ["new", "used"] as const;
export const listingStatuses = ["available", "pending", "sold"] as const;

export type ListingPriceType = (typeof listingPriceTypes)[number];
export type ListingCondition = (typeof listingConditions)[number];

export const POST_BODY_MAX = 1000;
export const LISTING_BODY_MAX = 5000;
export const LISTING_TITLE_MAX = 100;
export const LISTING_LOCATION_MAX = 100;
/** Up to $1,000,000.00. */
export const LISTING_PRICE_MAX_CENTS = 100_000_000;

/** Optional text: trimmed, and "" or missing becomes null. */
const optionalText = (max: number) =>
    z.string().trim().max(max).nullish().transform((v) => v || null);

export const postBody = z
    .string()
    .trim()
    .min(1, "Write something")
    .max(POST_BODY_MAX, `At most ${POST_BODY_MAX} characters`);

export const priceCents = z
    .number("Enter a price")
    .int()
    .min(0, "Price can't be negative")
    .max(LISTING_PRICE_MAX_CENTS, "At most $1,000,000");

/** "fixed" / "negotiable" need a price; "free" / "multiple" must not have one. */
export const listingPrice = z.discriminatedUnion("priceType", [
    z.object({ priceType: z.enum(["fixed", "negotiable"]), priceCents }),
    z.object({
        priceType: z.enum(["free", "multiple"]),
        priceCents: z.null().optional().transform(() => null),
    }),
]);

/** A listing's description (the post body) and details. */
export const listingInput = z
    .object({
        body: z
            .string()
            .trim()
            .min(1, "Describe what you're selling")
            .max(LISTING_BODY_MAX, `At most ${LISTING_BODY_MAX} characters`),
        title: z
            .string()
            .trim()
            .min(1, "Add a title")
            .max(LISTING_TITLE_MAX, `At most ${LISTING_TITLE_MAX} characters`),
        condition: z.enum(listingConditions).nullish().transform((v) => v ?? null),
        location: optionalText(LISTING_LOCATION_MAX),
    })
    .and(listingPrice);

export type ListingInput = z.input<typeof listingInput>;
