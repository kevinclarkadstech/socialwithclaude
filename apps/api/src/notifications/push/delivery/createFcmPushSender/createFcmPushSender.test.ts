import { describe, expect, it, mock } from "bun:test";
import type { PushMessage } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import { createFcmPushSender, fcmMessage } from "./createFcmPushSender";

const logger = { info() {}, warn() {}, error() {}, debug() {} } as unknown as AppLogger;

/** A service account key like Firebase's, with a real RSA key so signing works. */
async function serviceAccountJson(): Promise<string> {
    const pair = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["sign", "verify"],
    );
    const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
    return JSON.stringify({ project_id: "my-project", client_email: "push@my-project.iam.gserviceaccount.com", private_key: pem });
}

const message = (token: string): PushMessage => ({ token, title: "@sam_k", body: "Hello", path: "/chats/1", collapseId: "chat-1", badge: 3 });

/** Google's endpoints: the token exchange, then each send, answering per token as `answers` says. */
function fakeGoogle(answers: Record<string, { status: number; body: unknown }> = {}) {
    return mock(async (url: string, init: RequestInit) => {
        if (url === "https://oauth2.googleapis.com/token") {
            return new Response(JSON.stringify({ access_token: "access-1", expires_in: 3600 }), { status: 200 });
        }
        const token = (JSON.parse(init.body as string) as { message: { token: string } }).message.token;
        const answer = answers[token] ?? { status: 200, body: { name: "projects/my-project/messages/1" } };
        return new Response(JSON.stringify(answer.body), { status: answer.status });
    });
}

describe("createFcmPushSender", () => {
    it("signs in with the service account once, then sends each push to the project's endpoint", async () => {
        const fetch = fakeGoogle();
        const sender = createFcmPushSender({ serviceAccountJson: await serviceAccountJson(), logger, fetch });
        expect(await sender.send([message("a"), message("b")])).toEqual({ invalidTokens: [], failed: 0 });
        await sender.send([message("c")]);

        const calls = fetch.mock.calls as unknown as [string, RequestInit][];
        const tokenCalls = calls.filter(([url]) => url === "https://oauth2.googleapis.com/token");
        expect(tokenCalls).toHaveLength(1);
        const assertion = new URLSearchParams(tokenCalls[0]![1].body as URLSearchParams).get("assertion")!;
        const claims = JSON.parse(atob(assertion.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
        expect(claims).toMatchObject({ iss: "push@my-project.iam.gserviceaccount.com", scope: "https://www.googleapis.com/auth/firebase.messaging" });

        const sends = calls.filter(([url]) => url.startsWith("https://fcm.googleapis.com/"));
        expect(sends).toHaveLength(3);
        expect(sends[0]![0]).toBe("https://fcm.googleapis.com/v1/projects/my-project/messages:send");
        expect(new Headers(sends[0]![1].headers).get("authorization")).toBe("Bearer access-1");
    });

    it("reports tokens Firebase says are gone as invalid, and counts other failures", async () => {
        const fetch = fakeGoogle({
            dead: { status: 404, body: { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } } },
            busy: { status: 503, body: { error: { status: "UNAVAILABLE", details: [{ errorCode: "UNAVAILABLE" }] } } },
        });
        const sender = createFcmPushSender({ serviceAccountJson: await serviceAccountJson(), logger, fetch });
        expect(await sender.send([message("ok"), message("dead"), message("busy")])).toEqual({ invalidTokens: ["dead"], failed: 1 });
    });
});

describe("fcmMessage", () => {
    it("puts the path in data, and the collapse id where Android and iOS replace an older push with it", () => {
        expect(fcmMessage(message("t"))).toEqual({
            token: "t",
            notification: { title: "@sam_k", body: "Hello" },
            data: { path: "/chats/1" },
            android: { priority: "high", notification: { tag: "chat-1" } },
            apns: { headers: { "apns-collapse-id": "chat-1" }, payload: { aps: { sound: "default", badge: 3, "thread-id": "chat-1" } } },
        });
    });
});
