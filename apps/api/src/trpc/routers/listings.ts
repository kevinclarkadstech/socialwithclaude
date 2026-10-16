import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createListing,
    getListings,
    schema,
    setListingStatus,
    updateListing,
} from "../../data-access";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

const optionalText = (max: number) =>
    z.string().trim().max(max).nullish().transform((v) => v || null);

/** Up to $1,000,000.00. */
const priceCents = z.number().int().min(0).max(100_000_000);

// "fixed" / "negotiable" need a price; "free" / "multiple" must not have one.
const price = z.discriminatedUnion("priceType", [
    z.object({ priceType: z.enum(["fixed", "negotiable"]), priceCents }),
    z.object({
        priceType: z.enum(["free", "multiple"]),
        priceCents: z.null().optional().transform(() => null),
    }),
]);

const listingInput = z
    .object({
        body: z.string().trim().min(1).max(5000),
        title: z.string().trim().min(1).max(100),
        condition: z.enum(schema.listingConditions).nullish().transform((v) => v ?? null),
        location: optionalText(100),
    })
    .and(price);

export const listingsRouter = router({
    createListing: procedure.input(listingInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
        }

        return createListing(ctx.db, user.id, input);
    }),

    /** Replaces the description and details; author only. */
    updateListing: procedure
        .input(z.object({ id: z.string().min(1) }).and(listingInput))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            const { id, ...listing } = input;
            return updateListing(ctx.db, user.id, id, listing);
        }),

    /** Mark available / pending / sold; author only. */
    setListingStatus: procedure
        .input(z.object({ id: z.string().min(1), status: z.enum(schema.listingStatuses) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            return setListingStatus(ctx.db, user.id, input.id, input.status);
        }),

    /** Newest first, optionally filtered by status. Pass `nextCursor` as `cursor`. */
    getListings: procedure
        .input(
            z.object({
                status: z.enum(schema.listingStatuses).nullish(),
                cursor: z.string().nullish(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
        )
        .query(({ ctx, input }) => getListings(ctx.db, ctx.user?.id ?? null, input)),
});
