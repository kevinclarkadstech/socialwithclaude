/** The parts of Cloudflare's runtime module the API uses (without depending on @cloudflare/workers-types). */
declare module "cloudflare:workers" {
    /** Keeps the Worker running until `promise` settles, after the response has gone. */
    export function waitUntil(promise: Promise<unknown>): void;
}
