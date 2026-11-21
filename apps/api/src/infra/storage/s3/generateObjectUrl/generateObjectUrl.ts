/** A path-style object URL (endpoint/bucket/key): works on R2 and Garage alike. */
export function generateObjectUrl({ endpoint, bucket, key }: { endpoint: string; bucket: string; key: string }): URL {
    const path = key.split("/").map(encodeURIComponent).join("/");
    return new URL(`${endpoint}/${bucket}/${path}`);
}
