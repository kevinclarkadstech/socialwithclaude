import { asc, eq } from "drizzle-orm";

import type { MediaRowInput } from "../../media";
import { schema, type Database } from "../db";
import { rowToMediaDto } from "./shared";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The post's photos in order, in the shape withMedia() takes as `existing`. */
export async function getPostMediaRows(db: Database, postId: string): Promise<MediaRowInput[]> {
    return db
        .select({
            storageKey: schema.media.storageKey,
            mimeType: schema.media.mimeType,
            sizeBytes: schema.media.sizeBytes,
            width: schema.media.width,
            height: schema.media.height,
            altText: schema.media.altText,
        })
        .from(schema.media)
        .where(eq(schema.media.postId, postId))
        .orderBy(asc(schema.media.position));
}

/**
 * Replaces a post's photos with `rows` (position = array index). Run inside the
 * post's write transaction. Returns the photos as reads return them.
 */
export async function replacePostMedia(tx: Transaction, postId: string, rows: MediaRowInput[]) {
    await tx.delete(schema.media).where(eq(schema.media.postId, postId));
    if (rows.length === 0) return [];

    const inserted = await tx
        .insert(schema.media)
        .values(rows.map((row, position) => ({ ...row, postId, position })))
        .returning();

    return inserted.sort((a, b) => a.position - b.position).map(rowToMediaDto);
}
