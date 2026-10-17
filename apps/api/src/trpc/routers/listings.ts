import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createListing,
    getListings,
    getPostMediaRows,
    schema,
    setListingStatus,
    updateListing,
} from "../../data-access";
import { withMedia } from "../../media";
import { fillVisiblePage, getUserBlockList, isBlocked } from "../blocking";
import { mediaContext, requireUserAndProfile } from "../context";
import { mediaInput } from "../inputs";
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
    /** `media`: photo keys from media.createUploadUrl, in display order. */
    createListing: procedure
        .input(listingInput.and(z.object({ media: mediaInput.default([]) })))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

            if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
                throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
            }

            const { media, ...listing } = input;
            return withMedia(mediaContext(ctx, user.id), media, [], (rows) =>
                createListing(ctx.db, user.id, listing, rows),
            );
        }),

    /**
     * Replaces the description and details; author only. Omit `media` to leave
     * photos unchanged, or send it to replace them (as in posts.updatePost).
     */
    updateListing: procedure
        .input(
            z.object({ id: z.string().min(1), media: mediaInput.optional() }).and(listingInput),
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            const { id, media, ...listing } = input;
            if (!media) return updateListing(ctx.db, user.id, id, listing);

            const existing = await getPostMediaRows(ctx.db, id);
            return withMedia(mediaContext(ctx, user.id), media, existing, (rows) =>
                updateListing(ctx.db, user.id, id, listing, rows),
            );
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
        .query(async ({ ctx, input }) => {
            const blockList = await getUserBlockList(ctx);
            return fillVisiblePage(
                (cursor, limit) =>
                    getListings(ctx.db, ctx.user?.id ?? null, { status: input.status, cursor, limit }),
                input,
                (l) => !isBlocked(blockList, l.author.userId),
                (l) => l.id,
            );
        }),
});
