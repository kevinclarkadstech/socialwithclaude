/**
 * Object storage, as the API uses it: a private uploads bucket the app PUTs
 * files into with presigned URLs, and a public media bucket the API publishes
 * checked files to. Only this interface is used outside src/storage.
 */
export interface Storage {
    /** A presigned PUT into the uploads bucket. The content type and length are signed, so storage refuses anything else. */
    createUploadUrl(args: { key: string; contentType: string; contentLength: number; expiresInSeconds?: number }): Promise<string>;
    /** An uploaded object's bytes; null if there's no such upload. */
    readUpload(args: { key: string }): Promise<Uint8Array | null>;
    /** Deletes uploaded objects (whether or not they exist). */
    deleteUploads(args: { keys: string[] }): Promise<void>;
    /** Stores a public media object, cached for a year (keys are versioned by URL). */
    putMedia(args: { key: string; bytes: Uint8Array; contentType: string }): Promise<void>;
    /** Deletes public media objects (whether or not they exist). */
    deleteMedia(args: { keys: string[] }): Promise<void>;
}
