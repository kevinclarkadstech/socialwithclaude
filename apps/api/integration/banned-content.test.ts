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

const feedIds = async () => (await valueOf(ann.call.posts.getFeed({ limit: 100 }))).items.map((post) => post.id);
const commentIds = async () => (await valueOf(ann.call.postComments.getPostComments({ postId: annsPost.id, limit: 20 }))).items.map((comment) => comment.id);
const searchedPostIds = async () => (await valueOf(ann.call.posts.search({ query: "zzqx", limit: 20 }))).items.map((post) => post.id);
const foundUsernames = async () => (await valueOf(ann.call.users.search({ query: "spammy" }))).map((user) => user.username);
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
    };
}

const everything = { inFeed: true, post: "OK", comment: true, inPostSearch: true, profile: "OK", inPeopleSearch: true, inMentions: true };
const nothing = { inFeed: false, post: "NOT_FOUND", comment: false, inPostSearch: false, profile: "NOT_FOUND", inPeopleSearch: false, inMentions: false };

describe("a banned person's content", () => {
    it("shows before the ban", async () => {
        expect(await whatAnnSees()).toEqual(everything);
    });

    it("is hidden everywhere while they're banned", async () => {
        await valueOf(admin.call.admin.banUser({ userId: spammer.userId, reason: "Spam" }));
        expect(await whatAnnSees()).toEqual(nothing);
    });

    it("isn't deleted: it's back once the ban is lifted", async () => {
        await valueOf(admin.call.admin.unbanUser({ userId: spammer.userId }));
        expect(await whatAnnSees()).toEqual(everything);
    });

    it("is back once a ban has ended, without anyone lifting it", async () => {
        await valueOf(admin.call.admin.banUser({ userId: spammer.userId, expiresAt: new Date(Date.now() + 60_000).toISOString() }));
        expect((await whatAnnSees()).post).toBe("NOT_FOUND");
        await db.update(schema.users).set({ banExpires: new Date(Date.now() - 1000) }).where(eq(schema.users.id, spammer.userId));
        expect(await whatAnnSees()).toEqual(everything);
    });
});
