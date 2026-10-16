/**
 * Object storage for uploaded media (S3-compatible). Uploads go straight from
 * the client to storage via presigned URLs; the API only signs, inspects and
 * moves objects.
 */
export interface MediaStorage {
    /** Presigned PUT for exactly this object; the client must send `headers`. */
    createUploadUrl(
        key: string,
        mimeType: string,
        sizeBytes: number,
    ): Promise<{ url: string; headers: Record<string, string> }>;
    /** The object's real size and type (S3 HeadObject), or null if it doesn't exist. */
    head(key: string): Promise<{ sizeBytes: number; mimeType: string } | null>;
    /** Copy then delete (S3 has no rename). */
    move(fromKey: string, toKey: string): Promise<void>;
    delete(keys: string[]): Promise<void>;
}

/**
 * In-memory stand-in until a real S3 client is wired up. Issuing an upload URL
 * pretends the client uploaded exactly the declared file, so the full
 * attach flow can be exercised locally. State is lost on restart.
 */
export function createStubMediaStorage(): MediaStorage {
    const objects = new Map<string, { sizeBytes: number; mimeType: string }>();

    return {
        async createUploadUrl(key, mimeType, sizeBytes) {
            objects.set(key, { sizeBytes, mimeType });
            return {
                url: `https://storage.invalid/stub-upload/${key}`,
                headers: { "Content-Type": mimeType, "Content-Length": String(sizeBytes) },
            };
        },
        async head(key) {
            return objects.get(key) ?? null;
        },
        async move(fromKey, toKey) {
            const object = objects.get(fromKey);
            if (!object) throw new Error(`Stub storage: no object at ${fromKey}`);
            objects.set(toKey, object);
            objects.delete(fromKey);
        },
        async delete(keys) {
            for (const key of keys) objects.delete(key);
        },
    };
}
