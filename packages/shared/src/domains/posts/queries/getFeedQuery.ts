import type { z } from "zod";

import type { Query } from "../../../types/query";
import { UnexpectedError } from "../../../types/app-error";
import { fillVisiblePage, pageInput, type Page } from "../../../types/page";
import { fail, succeed } from "../../../types/result";
import { validate } from "../../../types/validate";
import { isBlocked, type BlockList } from "../../users/blocking";
import type { Post } from "../types";

export const getFeedInput = pageInput;
export type GetFeedInput = z.input<typeof getFeedInput>;

export type GetFeedDependencies = {
    /** A page of regular posts (not listings) the viewer may see, newest first. */
    fetchFeedPage: (cursor: string | null, limit: number) => Promise<Page<Post>>;
    /** The viewer's block list (empty when signed out). */
    fetchBlockList: () => Promise<BlockList>;
};

/**
 * The Feed: regular posts the viewer can see, newest first, minus authors
 * either of them blocked. Pass `nextCursor` as `cursor` for the next page.
 */
export const getFeedQuery: Query<{ input: GetFeedInput; output: Page<Post> }, GetFeedDependencies> = async ({
    input,
    context,
    dependencies,
}) => {
    const valid = validate(getFeedInput, input);
    if (valid.error) return valid;

    try {
        const blockList = await dependencies.fetchBlockList();
        const page = await fillVisiblePage(
            dependencies.fetchFeedPage,
            valid.value,
            (post) => !isBlocked(blockList, post.author.userId),
            (post) => post.id,
        );
        return succeed(page);
    } catch (err) {
        context.logger.error("getFeedQuery failed", { err });
        return fail(UnexpectedError());
    }
};
