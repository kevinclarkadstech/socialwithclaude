/** Who a user blocks, and who blocks them. Blocking hides content both ways. */
export type BlockList = {
    blocking: ReadonlySet<string>;
    blockedBy: ReadonlySet<string>;
};

/** A block list with nobody in it (e.g. when signed out). */
export const emptyBlockList: BlockList = { blocking: new Set(), blockedBy: new Set() };

/** True if either user has blocked the other. */
export function isBlocked(blockList: BlockList, userId: string): boolean {
    return blockList.blocking.has(userId) || blockList.blockedBy.has(userId);
}
