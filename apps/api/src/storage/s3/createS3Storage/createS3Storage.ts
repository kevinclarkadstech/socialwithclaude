import { AwsClient } from "aws4fetch";
import type { Storage } from "../../types";
import { deleteObject } from "../deleteObject/deleteObject";
import { generateObjectUrl } from "../generateObjectUrl/generateObjectUrl";

/**
 * Storage over the S3 API, with requests signed by aws4fetch (plain fetch, so
 * it runs on Node and on Workers alike): Cloudflare R2 in production, Garage
 * locally. Infrastructure only: what can be uploaded, and by whom, is decided
 * in the shared mutations.
 */
export function createS3Storage({ endpoint, region, accessKeyId, secretAccessKey, uploadsBucket, mediaBucket }: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    uploadsBucket: string;
    mediaBucket: string;
}): Storage {
    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region });

    return {
        async createUploadUrl({ key, contentType, contentLength, expiresInSeconds = 600 }) {
            const url = generateObjectUrl({ endpoint, bucket: uploadsBucket, key });
            url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
            const signed = await client.sign(
                new Request(url.toString(), {
                    method: "PUT",
                    headers: { "Content-Type": contentType, "Content-Length": String(contentLength) },
                }),
                { aws: { signQuery: true, allHeaders: true } },
            );
            return signed.url;
        },
        async readUpload({ key }) {
            const response = await client.fetch(generateObjectUrl({ endpoint, bucket: uploadsBucket, key }).toString());
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error(`Reading upload ${key} failed: ${response.status}`);
            }
            return new Uint8Array(await response.arrayBuffer());
        },
        async deleteUploads({ keys }) {
            await Promise.all(keys.map((key) => deleteObject({ client, endpoint, bucket: uploadsBucket, key })));
        },
        async putMedia({ key, bytes, contentType }) {
            const response = await client.fetch(generateObjectUrl({ endpoint, bucket: mediaBucket, key }).toString(), {
                method: "PUT",
                body: new Uint8Array(bytes),
                headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
            });
            if (!response.ok) {
                throw new Error(`Storing media ${key} failed: ${response.status}`);
            }
        },
        async deleteMedia({ keys }) {
            await Promise.all(keys.map((key) => deleteObject({ client, endpoint, bucket: mediaBucket, key })));
        },
    };
}
