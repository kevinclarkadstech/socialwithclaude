import type { PushMessage } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import type { PushSender } from "../types";

/** The parts of a Firebase service account key this needs. */
interface ServiceAccount {
    project_id: string;
    client_email: string;
    private_key: string;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** How many pushes go out at once. */
const concurrency = 10;

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const base64UrlJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * Sends through Firebase Cloud Messaging's HTTP v1 API, to Android and (with
 * the APNs key uploaded to Firebase) iOS. Signs its own short-lived access
 * token from the service account key with Web Crypto, so it runs on Node and
 * Workers alike, and keeps it until just before it expires.
 */
export function createFcmPushSender({ serviceAccountJson, logger, fetch = (url, init) => globalThis.fetch(url, init), now = () => Date.now() }: {
    serviceAccountJson: string;
    logger: AppLogger;
    fetch?: Fetch;
    now?: () => number;
}): PushSender {
    const account = JSON.parse(serviceAccountJson) as ServiceAccount;
    let accessToken: { value: string; expiresAt: number } | null = null;

    async function getAccessToken(): Promise<string> {
        if (accessToken && accessToken.expiresAt - 60_000 > now()) {
            return accessToken.value;
        }
        const issuedAt = Math.floor(now() / 1000);
        const unsigned = `${base64UrlJson({ alg: "RS256", typ: "JWT" })}.${base64UrlJson({
            iss: account.client_email,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            iat: issuedAt,
            exp: issuedAt + 3600,
        })}`;
        const der = Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (char) => char.charCodeAt(0));
        const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
        const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(signature)}` }),
        });
        if (!response.ok) {
            throw new Error(`Google refused the push service account (HTTP ${response.status})`);
        }
        const { access_token: value, expires_in: expiresIn } = await response.json() as { access_token: string; expires_in: number };
        accessToken = { value, expiresAt: now() + expiresIn * 1000 };
        return value;
    }

    /** One push; "invalid" when Firebase says the token is dead. */
    async function sendOne(message: PushMessage, accessTokenValue: string): Promise<"sent" | "invalid" | "failed"> {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
            method: "POST",
            headers: { authorization: `Bearer ${accessTokenValue}`, "content-type": "application/json" },
            body: JSON.stringify({ message: fcmMessage(message) }),
        });
        if (response.ok) {
            return "sent";
        }
        const body = await response.json().catch(() => null) as { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } } | null;
        const errorCode = body?.error?.details?.find((detail) => detail.errorCode)?.errorCode;
        if (errorCode === "UNREGISTERED" || (errorCode === "INVALID_ARGUMENT" && /registration token/i.test(body?.error?.message ?? ""))) {
            return "invalid";
        }
        logger.warn("Firebase didn't send a push", { status: response.status, errorCode: errorCode ?? body?.error?.status });
        return "failed";
    }

    return {
        async send(messages) {
            const invalidTokens: string[] = [];
            let failed = 0;
            if (messages.length === 0) {
                return { invalidTokens, failed };
            }
            const accessTokenValue = await getAccessToken();
            for (let start = 0; start < messages.length; start += concurrency) {
                const batch = messages.slice(start, start + concurrency);
                const outcomes = await Promise.all(batch.map((message) => sendOne(message, accessTokenValue).catch(() => "failed" as const)));
                outcomes.forEach((outcome, index) => {
                    if (outcome === "invalid") {
                        invalidTokens.push(batch[index]!.token);
                    } else if (outcome === "failed") {
                        failed += 1;
                    }
                });
            }
            return { invalidTokens, failed };
        },
    };
}

/**
 * A push as Firebase's message: the text, the path to open as data, and
 * `collapseId` as Android's tag and iOS's collapse id, so a newer push for
 * the same thing replaces the older one on the device.
 */
export function fcmMessage({ token, title, body, path, collapseId, badge }: PushMessage) {
    return {
        token,
        notification: { title, body },
        data: path ? { path } : {},
        android: {
            priority: "high",
            notification: collapseId ? { tag: collapseId } : {},
        },
        apns: {
            headers: collapseId ? { "apns-collapse-id": collapseId } : {},
            payload: {
                aps: {
                    sound: "default",
                    ...(badge !== null && { badge }),
                    ...(collapseId && { "thread-id": collapseId }),
                },
            },
        },
    };
}
