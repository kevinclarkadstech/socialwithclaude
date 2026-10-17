import { asc, eq } from "drizzle-orm";

import type { MediaRowInput } from "../../media";
import { schema, type Database, type Transaction } from "../db";
import { rowToMediaDto } from "./shared";

/** The post's photos in order, in the shape withMedia() takes as `existing`. */
export async function getPostMediaRows(db: Database, postId: string): Promise<MediaRowInput[]> {
    return db
        .select({
            storageKey: schema.postMedia.storageKey,
            mimeType: schema.postMedia.mimeType,
            sizeBytes: schema.postMedia.sizeBytes,
            width: schema.postMedia.width,
            height: schema.postMedia.height,
            altText: schema.postMedia.altText,
        })
        .from(schema.postMedia)
        .where(eq(schema.postMedia.postId, postId))
        .orderBy(asc(schema.postMedia.position));
}

/**
 * Replaces a post's photos with `rows` (position = array index). Run inside the
 * post's write transaction. Returns the photos as reads return them.
 */
export async function replacePostMedia(tx: Transaction, postId: string, rows: MediaRowInput[]) {
    await tx.delete(schema.postMedia).where(eq(schema.postMedia.postId, postId));
    if (rows.length === 0) return [];

    const inserted = await tx
        .insert(schema.postMedia)
        .values(rows.map((row, position) => ({ ...row, postId, position })))
        .returning();

    return inserted.sort((a, b) => a.position - b.position).map(rowToMediaDto);
}
