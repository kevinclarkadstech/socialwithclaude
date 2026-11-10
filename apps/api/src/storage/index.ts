import { AwsClient } from "aws4fetch";
import { serverConfig } from "../config";

/**
 * Object storage through the S3 API, with requests signed by aws4fetch (plain
 * fetch, so it runs on Node and on Workers alike). Cloudflare R2 in
 * production, Garage locally. Infrastructure only: what can be uploaded, and
 * by whom, is decided in the shared mutations.
 */
const client = new AwsClient({
    accessKeyId: serverConfig.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: serverConfig.STORAGE_SECRET_ACCESS_KEY,
    service: "s3",
    region: serverConfig.STORAGE_REGION,
});

/** Path-style object URL: works on R2 and Garage alike. */
function objectUrl(bucket: string, key: string): URL {
    const path = key.split("/").map(encodeURIComponent).join("/");
    return new URL(`${serverConfig.STORAGE_ENDPOINT}/${bucket}/${path}`);
}

/** Where media objects are publicly served from. */
export const mediaPublicUrl = serverConfig.STORAGE_MEDIA_PUBLIC_URL;

/**
 * A presigned PUT into the uploads bucket. The content type and length are
 * signed, so storage refuses an upload that doesn't match them exactly.
 */
export async function createUploadUrl({ key, contentType, contentLength, expiresInSeconds = 600 }: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds?: number;
}): Promise<string> {
    const url = objectUrl(serverConfig.STORAGE_UPLOADS_BUCKET, key);
    url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
    const signed = await client.sign(
        new Request(url.toString(), {
            method: "PUT",
            headers: { "Content-Type": contentType, "Content-Length": String(contentLength) },
        }),
        { aws: { signQuery: true, allHeaders: true } },
    );
    return signed.url;
}

/** An uploaded object's bytes; null if there's no such upload. */
export async function readUpload({ key }: { key: string }): Promise<Uint8Array | null> {
    const response = await client.fetch(objectUrl(serverConfig.STORAGE_UPLOADS_BUCKET, key).toString());
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Reading upload ${key} failed: ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}

/** Deletes uploaded objects (whether or not they exist). */
export async function deleteUploads({ keys }: { keys: string[] }): Promise<void> {
    await Promise.all(keys.map((key) => deleteObject(serverConfig.STORAGE_UPLOADS_BUCKET, key)));
}

/** Stores a public media object, cached for a year: keys are versioned by URL (see the media domain). */
export async function putMedia({ key, bytes, contentType }: { key: string; bytes: Uint8Array; contentType: string }): Promise<void> {
    const response = await client.fetch(objectUrl(serverConfig.STORAGE_MEDIA_BUCKET, key).toString(), {
        method: "PUT",
        body: new Uint8Array(bytes),
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!response.ok) {
        throw new Error(`Storing media ${key} failed: ${response.status}`);
    }
}

/** Deletes public media objects (whether or not they exist). */
export async function deleteMedia({ keys }: { keys: string[] }): Promise<void> {
    await Promise.all(keys.map((key) => deleteObject(serverConfig.STORAGE_MEDIA_BUCKET, key)));
}

async function deleteObject(bucket: string, key: string): Promise<void> {
    const response = await client.fetch(objectUrl(bucket, key).toString(), { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Deleting ${bucket}/${key} failed: ${response.status}`);
    }
}
