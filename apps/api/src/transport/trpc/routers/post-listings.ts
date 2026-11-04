import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createListing,
    getListings,
    getPostMediaRows,
    isOwnPostId,
    schema,
    setListingStatus,
    updateListing,
} from "../../../data-access";
import { withMedia } from "../../../media";
import { fillVisiblePage, getUserBlockList, isBlocked } from "../blocking";
import { mediaContext, requireUserAndProfile } from "../context";
import { clientId, createOnce } from "../client-ids";
import { mediaInput } from "../inputs";
import { procedure, router } from "../trpc";
import { PostListingSchema } from "@myapp/shared/domains/posts/types/post-listing";

export const postListingsRouter = router({
    /**
     * `media`: photo keys from media.createUploadUrl, in display order. `id` is
     * an optional client-generated ULID; retrying with it succeeds without
     * creating the listing again. Returns nothing (fire and forget).
     */
    createListing: procedure
        .input(PostListingSchema)
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

            if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
                throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
            }


        }),

    /**
     * Replaces the description and details; author only. Omit `media` to leave
     * photos unchanged, or send it to replace them (as in posts.updatePost).
     */
    updateListing: procedure
        .input(
            PostListingSchema,
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

        }),

    /** Mark available / pending / sold; author only. */
    // setListingStatus: procedure
    //     .input(z.object({ id: z.string().min(1), status: z.enum(schema.listingStatuses) }))
    //     .mutation(async ({ ctx, input }) => {
    //         const { user } = await requireUserAndProfile(ctx);
    //         await setListingStatus(ctx.db, user.id, input.id, input.status);
    //     }),

    /**
     * Listings the caller can see, newest first, optionally filtered by
     * status. Pass `nextCursor` as `cursor`.
     */
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
            // return fillVisiblePage(
            //     (cursor, limit) =>
            //         getListings(ctx.db, ctx.user?.id ?? null, { status: input.status, cursor, limit }),
            //     input,
            //     (l) => !isBlocked(blockList, l.author.userId),
            //     (l) => l.id,
            // );
        }),
});
