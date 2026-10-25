import type { z } from "zod";

import type { Query } from "../../../types/query";
import { AuthenticationError, UnexpectedError } from "../../../types/app-error";
import { fillVisiblePage, pageInput, type Page } from "../../../types/page";
import { fail, succeed } from "../../../types/result";
import { validate } from "../../../types/validate";
import { isBlocked, type BlockList } from "../../users/blocking";
import type { SavedPost } from "../types/post";

export const getMySavedPostsInput = pageInput;
export type GetMySavedPostsInput = z.input<typeof getMySavedPostsInput>;

export type GetMySavedPostsDependencies = {
    /**
     * A page of the viewer's saved posts they can still see, most recently
     * saved first. Each comes with its position in the list (`cursor`).
     */
    fetchSavedPostsPage: (
        cursor: string | null,
        limit: number,
    ) => Promise<Page<{ post: SavedPost; cursor: string }>>;
    /** The viewer's block list. */
    fetchBlockList: () => Promise<BlockList>;
};

/**
 * The viewer's saved posts, most recently saved first, minus ones by users
 * either of them blocked. "authentication" when signed out. Pass `nextCursor`
 * as `cursor` for the next page.
 */
export const getMySavedPostsQuery: Query<
    { input: GetMySavedPostsInput; output: Page<SavedPost> },
    GetMySavedPostsDependencies
> = async ({ input, context, dependencies }) => {
    if (!context.user) return fail(AuthenticationError());
    const valid = validate(getMySavedPostsInput, input);
    if (valid.error) return valid;

    try {
        const blockList = await dependencies.fetchBlockList();
        const page = await fillVisiblePage(
            dependencies.fetchSavedPostsPage,
            valid.value,
            (saved) => !isBlocked(blockList, saved.post.author.userId),
            (saved) => saved.cursor,
        );
        return succeed({ items: page.items.map((saved) => saved.post), nextCursor: page.nextCursor });
    } catch (err) {
        context.logger.error("getMySavedPostsQuery failed", { err });
        return fail(UnexpectedError());
    }
};
