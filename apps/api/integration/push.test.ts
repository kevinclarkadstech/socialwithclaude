import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import type { PushMessage } from "@myapp/shared/domains";
import { db, newId, schema } from "../src/data-access/db";
import { deliverPushes, type PushSender } from "../src/notifications";
import { createTestUser, type TestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child: () => silentLogger, setBindings() {} };

/** A sender that keeps what it was asked to send, and says the tokens in `dead` are invalid. */
function fakeSender(dead: string[] = []) {
    const sent: PushMessage[] = [];
    const sender: PushSender = {
        async send(messages) {
            sent.push(...messages);
            return { invalidTokens: messages.map((message) => message.token).filter((token) => dead.includes(token)), failed: 0 };
        },
    };
    return { sender, sent };
}

/**
 * Runs delivery rounds until nothing's left to take (the database is shared
 * with other test files, whose notifications are taken too, but only these
 * tests' users have devices), and returns the pushes sent to `token`.
 */
async function deliver({ token, chatDelaySeconds = 0, dead = [] }: { token: string; chatDelaySeconds?: number; dead?: string[] }) {
    const { sender, sent } = fakeSender(dead);
    for (let round = 0; round < 20; round++) {
        const summary = await deliverPushes({ sender, logger: silentLogger, chatDelaySeconds, limit: 500 });
        if (summary.notifications === 0 && summary.chats === 0) {
            break;
        }
    }
    return sent.filter((message) => message.token === token);
}

/** Signs `user` in on a device (a session row, as better-auth makes) and registers its push token. */
async function addDevice(user: TestUser): Promise<string> {
    const sessionId = `session-${user.userId}`;
    await db.insert(schema.sessions).values({ id: sessionId, token: `t-${newId()}`, userId: user.userId, expiresAt: new Date(Date.now() + 86_400_000) }).onConflictDoNothing();
    const token = `fcm-token-${newId()}`;
    await valueOf(user.call.notifications.registerPushToken({ token, platform: "ios" }));
    return token;
}

const tokensOf = async (userId: string) => (await db.select().from(schema.pushTokens).where(eq(schema.pushTokens.userId, userId))).map((row) => row.token);

// The tests run in order and build on each other.
const ann = await createTestUser({ name: "pushann" });
const sam = await createTestUser({ name: "pushsam" });
const lee = await createTestUser({ name: "pushlee" });
const annsToken = await addDevice(ann);
const annsPost = await valueOf(ann.call.posts.createPost({ id: newId(), content: "New exhaust fitted" }));
// Anything from setting up is out of the way.
await deliver({ token: annsToken });

describe("push notifications", () => {
    it("pushes a notification in the bell's words, with where tapping it goes and the unread count", async () => {
        await valueOf(sam.call.postComments.createPostComment({ id: newId(), postId: annsPost.id, content: "Sounds great" }));
        const pushes = await deliver({ token: annsToken });
        expect(pushes).toHaveLength(1);
        expect(pushes[0]).toMatchObject({
            title: `@${sam.username}`,
            body: "commented on your post: “Sounds great”",
            path: `/feed/posts/${annsPost.id}`,
            collapseId: null,
        });
        expect(pushes[0]!.badge).toBeGreaterThanOrEqual(1);
        // Pushed once only.
        expect(await deliver({ token: annsToken })).toEqual([]);
    });

    it("doesn't push a kind they turned off, and still pushes the rest", async () => {
        await valueOf(ann.call.users.updateMySettings({ pushComments: false }));
        await valueOf(sam.call.postComments.createPostComment({ id: newId(), postId: annsPost.id, content: "Again" }));
        await valueOf(lee.call.users.follow({ username: ann.username }));
        const pushes = await deliver({ token: annsToken });
        expect(pushes.map((push) => push.body)).toEqual(["started following you."]);
        await valueOf(ann.call.users.updateMySettings({ pushComments: true }));
    });

    it("doesn't push something undone before it was due", async () => {
        await valueOf(sam.call.users.follow({ username: ann.username }));
        await valueOf(sam.call.users.unfollow({ username: ann.username }));
        expect(await deliver({ token: annsToken })).toEqual([]);
    });

    it("makes one push for a burst of chat messages, replaced by the next one for that chat", async () => {
        const chat = await valueOf(sam.call.chats.getOrCreateDirectChat({ id: newId(), username: ann.username }));
        for (const content of ["Hey", "Is the car still for sale?", "I can pick it up today"]) {
            await valueOf(sam.call.chats.sendMessage({ id: newId(), chatId: chat.id, content }));
        }
        const first = await deliver({ token: annsToken });
        expect(first).toEqual([expect.objectContaining({
            title: `@${sam.username} · 3 new messages`,
            body: "I can pick it up today",
            path: `/chats/${chat.id}`,
            collapseId: `chat-${chat.id}`,
        })]);

        // One more before she reads it: the next push counts all four, and replaces the first on her phone.
        await valueOf(sam.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Hello?" }));
        expect(await deliver({ token: annsToken })).toEqual([expect.objectContaining({ title: `@${sam.username} · 4 new messages`, body: "Hello?", collapseId: `chat-${chat.id}` })]);

        // Read in the app before the delay is up: no push.
        await valueOf(sam.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "See you soon" }));
        await valueOf(ann.call.chats.markRead({ chatId: chat.id }));
        expect(await deliver({ token: annsToken })).toEqual([]);
    });

    it("waits for the chat delay before pushing a message", async () => {
        const chat = await valueOf(lee.call.chats.getOrCreateDirectChat({ id: newId(), username: ann.username }));
        await valueOf(lee.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Nice car" }));
        expect(await deliver({ token: annsToken, chatDelaySeconds: 600 })).toEqual([]);
        expect(await deliver({ token: annsToken })).toEqual([expect.objectContaining({ title: `@${lee.username}`, body: "Nice car" })]);
    });

    it("deletes a token Firebase says is dead", async () => {
        await valueOf(lee.call.postComments.createPostComment({ id: newId(), postId: annsPost.id, content: "Loud!" }));
        await deliver({ token: annsToken, dead: [annsToken] });
        expect(await tokensOf(ann.userId)).toEqual([]);
    });

    it("stops pushing to a device when its session ends, or when it's turned off there", async () => {
        const token = await addDevice(ann);
        expect(await tokensOf(ann.userId)).toEqual([token]);
        // Someone else can't turn off Ann's device.
        expect(await outcome(sam.call.notifications.unregisterPushToken({ token }))).toBe("OK");
        expect(await tokensOf(ann.userId)).toEqual([token]);
        await valueOf(ann.call.notifications.unregisterPushToken({ token }));
        expect(await tokensOf(ann.userId)).toEqual([]);

        await addDevice(ann);
        await db.delete(schema.sessions).where(eq(schema.sessions.id, `session-${ann.userId}`));
        expect(await tokensOf(ann.userId)).toEqual([]);
    });
});
