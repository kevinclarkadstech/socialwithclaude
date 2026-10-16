import { ulid } from "ulid";

import type { AppLogger } from "@myapp/shared/observability";
import { serverConfig } from "../config";
import { createStubMediaStorage, type MediaStorage } from "./storage";

export type { MediaStorage } from "./storage";

export const MEDIA_MAX_PER_POST = 10;
export const MEDIA_MAX_BYTES = 1024 * 1024; // 1 MB

/** Allowed photo types and the file extension used in their keys. */
export const MEDIA_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;
export type MediaMimeType = keyof typeof MEDIA_TYPES;
export const mediaMimeTypes = Object.keys(MEDIA_TYPES) as [MediaMimeType, ...MediaMimeType[]];

// TODO: swap for an S3 client once storage is set up.
export const mediaStorage: MediaStorage = createStubMediaStorage();

/** Public URL for a stored object. */
export function mediaUrl(key: string) {
    return `${serverConfig.MEDIA_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

/**
 * Uploads land under tmp/{userId}/ (expired by a bucket lifecycle rule if
 * never attached) and are moved to media/{userId}/ when a post uses them.
 */
export function createUploadKey(userId: string, mimeType: MediaMimeType) {
    return `tmp/${userId}/${ulid()}.${MEDIA_TYPES[mimeType]}`;
}

const permanentKeyFor = (tmpKey: string) => tmpKey.replace(/^tmp\//, "media/");

export class InvalidMediaError extends Error {
    constructor(reason: string) {
        super(reason);
        this.name = "InvalidMediaError";
    }
}

/** A photo as submitted with a post: an upload key, or the key of a photo it already has. */
export type MediaInput = {
    key: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
};

/** A validated photo, ready to store as a media row (position = array index). */
export type MediaRowInput = {
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    altText: string | null;
};

/**
 * Validates a post's submitted photos, moves new uploads into place, then runs
 * `write` with the resulting rows (in submitted order).
 *
 * Each item must be either a photo the post already has (`existing`) or an
 * upload this user made (tmp/{userId}/…) whose real size and type pass the
 * limits. Existing photos left out of `items` are deleted from storage after
 * `write` succeeds; if `write` fails, newly moved files are deleted instead.
 *
 * @throws InvalidMediaError if any item fails validation.
 */
export async function withMedia<T>(
    { storage, logger, userId }: { storage: MediaStorage; logger: AppLogger; userId: string },
    items: MediaInput[],
    existing: MediaRowInput[],
    write: (rows: MediaRowInput[]) => Promise<T>,
): Promise<T> {
    if (items.length > MEDIA_MAX_PER_POST) {
        throw new InvalidMediaError(`At most ${MEDIA_MAX_PER_POST} photos per post`);
    }
    if (new Set(items.map((i) => i.key)).size !== items.length) {
        throw new InvalidMediaError("Duplicate photo");
    }

    const existingByKey = new Map(existing.map((m) => [m.storageKey, m]));
    const uploadPrefix = `tmp/${userId}/`;

    // Validate everything before touching storage.
    const staged = await Promise.all(
        items.map(async (item) => {
            // Kept photos keep their dimensions unless new ones are sent; alt
            // text follows the submission (omit or null to clear it).
            const kept = existingByKey.get(item.key);
            if (kept) {
                return {
                    ...kept,
                    width: item.width ?? kept.width,
                    height: item.height ?? kept.height,
                    altText: item.altText ?? null,
                    uploadKey: null,
                };
            }

            if (!item.key.startsWith(uploadPrefix)) {
                throw new InvalidMediaError("Unknown photo");
            }
            const object = await storage.head(item.key);
            if (!object) throw new InvalidMediaError("Photo upload not found");
            if (!(object.mimeType in MEDIA_TYPES)) {
                throw new InvalidMediaError("Unsupported photo type");
            }
            if (object.sizeBytes > MEDIA_MAX_BYTES) {
                throw new InvalidMediaError("Photo is larger than 1 MB");
            }

            return {
                storageKey: permanentKeyFor(item.key),
                mimeType: object.mimeType,
                sizeBytes: object.sizeBytes,
                width: item.width ?? null,
                height: item.height ?? null,
                altText: item.altText ?? null,
                uploadKey: item.key,
            };
        }),
    );

    const moved: string[] = [];
    try {
        for (const s of staged) {
            if (!s.uploadKey) continue;
            await storage.move(s.uploadKey, s.storageKey);
            moved.push(s.storageKey);
        }

        const result = await write(staged.map(({ uploadKey: _, ...row }) => row));

        const keptKeys = new Set(staged.map((s) => s.storageKey));
        const removed = existing.map((m) => m.storageKey).filter((key) => !keptKeys.has(key));
        if (removed.length > 0) {
            await storage.delete(removed).catch((err) => {
                logger.error("Failed to delete removed media", { err, keys: removed });
            });
        }

        return result;
    } catch (err) {
        if (moved.length > 0) {
            await storage.delete(moved).catch((cleanupErr) => {
                logger.error("Failed to clean up moved media", { err: cleanupErr, keys: moved });
            });
        }
        throw err;
    }
}
