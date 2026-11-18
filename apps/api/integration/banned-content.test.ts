import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const admin = await createTestUser({ name: "boss" });
await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, admin.userId));
const spammer = await createTestUser({ name: "spammy" });
const ann = await createTestUser({ name: "ann" });

const spamPost = await valueOf(spammer.call.posts.createPost({ id: newId(), content: "Cheap watches zzqx" }));
const annsPost = await valueOf(ann.call.posts.createPost({ id: newId(), content: "My garden" }));
const spamComment = await valueOf(spammer.call.postComments.createPostComment({ id: newId(), postId: annsPost.id, content: "Visit my shop" }));
const spamListing = await valueOf(spammer.call.posts.createPost({
    id: newId(),
    content: "Fake designer bag",
    listing: { title: "Designer bag", description: "Fake designer bag", condition: "new", isNegotiable: false, type: "fixed", priceCents: 5000 },
}));
const chat = await valueOf(ann.call.chats.getOrCreateDirectChat({ id: newId(), username: spammer.username }));
await valueOf(spammer.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Buy now" }));

const feedIds = async () => (await valueOf(ann.call.posts.getFeed({ limit: 100 }))).items.map((post) => post.id);
const commentIds = async () => (await valueOf(ann.call.postComments.getPostComments({ postId: annsPost.id, limit: 20 }))).items.map((comment) => comment.id);
const searchedPostIds = async () => (await valueOf(ann.call.posts.search({ query: "zzqx", limit: 20 }))).items.map((post) => post.id);
const foundUsernames = async () => (await valueOf(ann.call.users.search({ query: "spammy" }))).map((user) => user.username);
const listingIds = async () => (await valueOf(ann.call.postListings.getListings({ limit: 100 }))).items.map((post) => post.id);
const annsChat = async () => (await valueOf(ann.call.chats.getMyChats({ limit: 50 }))).items.find((item) => item.id === chat.id);
const mentionUsernames = async () => (await valueOf(ann.call.users.suggestMentions({ query: "spammy" }))).map((user) => user.username);

/** Everything about the spammer that shows to Ann. */
async function whatAnnSees() {
    return {
        inFeed: (await feedIds()).includes(spamPost.id),
        post: await outcome(ann.call.posts.getPostById({ postId: spamPost.id })),
        comment: (await commentIds()).includes(spamComment.id),
        inPostSearch: (await searchedPostIds()).includes(spamPost.id),
        profile: await outcome(ann.call.users.getUserProfile({ username: spammer.username })),
        inPeopleSearch: (await foundUsernames()).includes(spammer.username),
        inMentions: (await mentionUsernames()).includes(spammer.username),
        inListings: (await listingIds()).includes(spamListing.id),
        listing: await outcome(ann.call.posts.getPostById({ postId: spamListing.id })),
    };
}

const everything = { inFeed: true, post: "OK", comment: true, inPostSearch: true, profile: "OK", inPeopleSearch: true, inMentions: true, inListings: true, listing: "OK" };
const nothing = { inFeed: false, post: "NOT_FOUND", comment: false, inPostSearch: false, profile: "NOT_FOUND", inPeopleSearch: false, inMentions: false, inListings: false, listing: "NOT_FOUND" };

describe("a banned person's content", () => {
    it("shows before the ban", async () => {
        expect(await whatAnnSees()).toEqual(everything);
    });

    it("is hidden everywhere while they're banned", async () => {
        await valueOf(admin.call.admin.banUser({ userId: spammer.userId, reason: "Spam" }));
        expect(await whatAnnSees()).toEqual(nothing);
    });

    it("leaves their chats in place, marked unavailable, and closed to replies", async () => {
        const shown = await annsChat();
        expect(shown?.otherMember).toMatchObject({ userId: spammer.userId, isUnavailable: true });
        expect((await valueOf(ann.call.chats.getMessages({ chatId: chat.id, limit: 20 }))).items.map((message) => message.content)).toEqual(["Buy now"]);
        expect(await outcome(ann.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Stop" }))).toBe("FORBIDDEN");
        expect(await outcome(ann.call.chats.getOrCreateDirectChat({ id: newId(), username: spammer.username }))).toBe("NOT_FOUND");
    });

    it("isn't deleted: it's back once the ban is lifted", async () => {
        await valueOf(admin.call.admin.unbanUser({ userId: spammer.userId }));
        expect(await whatAnnSees()).toEqual(everything);
        expect((await annsChat())?.otherMember.isUnavailable).toBe(false);
        expect(await outcome(ann.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Hi again" }))).toBe("OK");
    });

    it("is back once a ban has ended, without anyone lifting it", async () => {
        await valueOf(admin.call.admin.banUser({ userId: spammer.userId, expiresAt: new Date(Date.now() + 60_000).toISOString() }));
        expect((await whatAnnSees()).post).toBe("NOT_FOUND");
        await db.update(schema.users).set({ banExpires: new Date(Date.now() - 1000) }).where(eq(schema.users.id, spammer.userId));
        expect(await whatAnnSees()).toEqual(everything);
    });
});
