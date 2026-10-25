import { emptyBlockList, isBlocked, type BlockList } from "@myapp/shared/domains/users";
import { fillVisiblePage } from "@myapp/shared/types/page";

import { getBlockListRows } from "../data-access";
import type { TRPCContext } from "./context";

export type UserBlockList = BlockList;

const blockListByRequest = new WeakMap<TRPCContext, Promise<UserBlockList>>();

/**
 * The caller's block list, loaded on first use and cached for the rest of the
 * request. Empty when signed out.
 */
export function getUserBlockList(ctx: TRPCContext): Promise<UserBlockList> {
    const userId = ctx.user?.id;
    if (!userId) return Promise.resolve(emptyBlockList);

    let blockList = blockListByRequest.get(ctx);
    if (!blockList) {
        blockList = getBlockListRows(ctx.db, userId).then(({ blocking, blockedBy }) => ({
            blocking: new Set(blocking),
            blockedBy: new Set(blockedBy),
        }));
        blockListByRequest.set(ctx, blockList);
    }
    return blockList;
}

// Shared with the domain queries in @myapp/shared.
export { fillVisiblePage, isBlocked };
