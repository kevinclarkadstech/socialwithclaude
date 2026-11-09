/**
 * A random token for a media address (128 bits, base64url), so it can't be
 * guessed. Web Crypto, so it runs on Node and on Workers alike.
 */
export function newMediaToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
