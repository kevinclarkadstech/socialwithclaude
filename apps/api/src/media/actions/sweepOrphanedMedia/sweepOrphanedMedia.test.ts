import { describe, expect, it, mock } from "bun:test";
import { silentLogger } from "../../testing";
import { sweepOrphanedMedia } from "./sweepOrphanedMedia";

const U = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const POST = "01JBBBBBBBBBBBBBBBBBBBBBB1";
const LIVE = "01JMMMMMMMMMMMMMMMMMMMMMM1";
const ORPHAN = "01JMMMMMMMMMMMMMMMMMMMMMM2";
const NEW = "01JMMMMMMMMMMMMMMMMMMMMMM3";
const old = new Date("2026-11-01T00:00:00Z");
const recent = new Date("2026-11-16T11:00:00Z");
const olderThan = new Date("2026-11-15T12:00:00Z");
const key = (photoId: string, size: number) => `${U}/${POST}/${photoId}-${size}`;

function sweep({ dryRun, failFirstDelete = false }: { dryRun: boolean; failFirstDelete?: boolean }) {
    // Two pages, so the cursor is followed.
    const pages = [
        { objects: [{ key: key(LIVE, 320), lastModified: old }, { key: key(ORPHAN, 320), lastModified: old }, { key: `users/${U}/avatar-96`, lastModified: old }], nextCursor: "page-2" },
        { objects: [{ key: key(ORPHAN, 640), lastModified: old }, { key: key(NEW, 320), lastModified: recent }], nextCursor: null },
    ];
    const listMedia = mock(async ({ cursor }: { cursor?: string | null }) => pages[cursor ? 1 : 0]!);
    let deletes = 0;
    const deleteMedia = mock(async (_args: { keys: string[] }) => {
        deletes += 1;
        if (failFirstDelete && deletes === 1) {
            throw new Error("storage down");
        }
    });
    const getLivePostMediaIds = mock(async ({ photoIds }: { photoIds: string[] }) => new Set(photoIds.filter((id) => id === LIVE).map((id) => `${POST}/${id}`)));
    const result = sweepOrphanedMedia({ storage: { listMedia, deleteMedia }, logger: silentLogger, getLivePostMediaIds, olderThan, dryRun });
    return { result, listMedia, deleteMedia, getLivePostMediaIds };
}

describe("sweepOrphanedMedia", () => {
    it("deletes old post photo files no live post uses, page by page, leaving new files and profile photos alone", async () => {
        const { result, deleteMedia, listMedia } = sweep({ dryRun: false });
        expect(await result).toEqual({ checked: 5, orphaned: [key(ORPHAN, 320), key(ORPHAN, 640)], deleted: true, failedPages: 0 });
        expect(listMedia).toHaveBeenCalledTimes(2);
        expect(deleteMedia.mock.calls.map(([args]) => args.keys)).toEqual([[key(ORPHAN, 320)], [key(ORPHAN, 640)]]);
    });

    it("only reports on a dry run", async () => {
        const { result, deleteMedia } = sweep({ dryRun: true });
        expect(await result).toEqual({ checked: 5, orphaned: [key(ORPHAN, 320), key(ORPHAN, 640)], deleted: false, failedPages: 0 });
        expect(deleteMedia).not.toHaveBeenCalled();
    });

    it("keeps sweeping when a page's delete fails, counting it", async () => {
        const { result, deleteMedia } = sweep({ dryRun: false, failFirstDelete: true });
        expect((await result).failedPages).toBe(1);
        expect(deleteMedia).toHaveBeenCalledTimes(2);
    });
});
