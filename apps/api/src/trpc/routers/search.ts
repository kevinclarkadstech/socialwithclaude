import { z } from "zod";

import { searchPostsAndListings, searchUsers } from "../../data-access";
import { fillVisiblePage, getUserBlockList, isBlocked, type UserBlockList } from "../blocking";
import type { TRPCContext } from "../context";
import { procedure, router } from "../trpc";

const query = z.string().trim().min(1).max(100);

/** Results per section in `global`. */
const GLOBAL_SECTION_SIZE = 5;

/** Users matching `query`, minus anyone blocked either way. */
async function visibleUsers(ctx: TRPCContext, blockList: UserBlockList, query: string, limit: number) {
    const users = await searchUsers(ctx.db, query, { limit });
    return users.filter((u) => !isBlocked(blockList, u.id));
}

/** A page of posts or listings matching `query`, minus blocked authors. */
function visiblePosts(
    ctx: TRPCContext,
    blockList: UserBlockList,
    query: string,
    kind: "post" | "listing",
    page: { cursor?: string | null; limit: number },
) {
    return fillVisiblePage(
        (cursor, limit) => searchPostsAndListings(ctx.db, query, { kind, cursor, limit }),
        page,
        (r) => !isBlocked(blockList, r.author.userId),
        (r) => r.id,
    );
}

export const searchRouter = router({
    /**
     * The search screen: the top few users, posts and listings matching
     * `query`. To see more, pass a section's `nextCursor` to `posts` (with
     * that `kind`), or call `users` with a higher limit.
     */
    global: procedure.input(z.object({ query })).query(async ({ ctx, input }) => {
        const blockList = await getUserBlockList(ctx);
        const page = { limit: GLOBAL_SECTION_SIZE };
        const [users, posts, listings] = await Promise.all([
            visibleUsers(ctx, blockList, input.query, GLOBAL_SECTION_SIZE),
            visiblePosts(ctx, blockList, input.query, "post", page),
            visiblePosts(ctx, blockList, input.query, "listing", page),
        ]);
        return { users, posts, listings };
    }),

    /** Users whose username or name starts with `query`, best match first. */
    users: procedure
        .input(z.object({ query, limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) => {
            return visibleUsers(ctx, await getUserBlockList(ctx), input.query, input.limit);
        }),

    /** Posts or listings containing `query`, newest first. Pass `nextCursor` as `cursor`. */
    posts: procedure
        .input(
            z.object({
                query,
                kind: z.enum(["post", "listing"]).default("post"),
                cursor: z.string().nullish(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { query, kind, ...page } = input;
            return visiblePosts(ctx, await getUserBlockList(ctx), query, kind, page);
        }),
});
