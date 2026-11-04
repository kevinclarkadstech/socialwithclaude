import { z } from "zod";
import { PageInputSchema } from "@myapp/shared/common";
import { succeed } from "@myapp/shared/utils";

import { searchPosts, searchUserProfiles } from "../../../data-access";
import { procedure, router } from "../trpc";

const query = z.string().trim().min(1).max(100);

export const searchRouter = router({
    /** Profiles whose username or name contains `query`. */
    users: procedure
        .input(z.object({ query, limit: z.int().min(1).max(50).default(20) }))
        .query(async ({ input }) => succeed(await searchUserProfiles(input))),

    /** Posts and listings whose content (or listing title) contains `query`, newest first. */
    posts: procedure
        .input(PageInputSchema.extend({ query }))
        .query(async ({ input }) => succeed(await searchPosts(input))),
});
