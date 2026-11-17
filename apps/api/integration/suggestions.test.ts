import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db, newId, schema } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other. Other test files' users are in the same
// database, so checks look at this file's people (and their order) only.
const me = await createTestUser({ name: "sg_me", visibility: "public" });
const amy = await createTestUser({ name: "sg_amy", visibility: "public" });
const ben = await createTestUser({ name: "sg_ben", visibility: "public" });
const cat = await createTestUser({ name: "sg_cat", visibility: "followers" });
const dan = await createTestUser({ name: "sg_dan", visibility: "public" });
const eve = await createTestUser({ name: "sg_eve", visibility: "public" });
const mine = [amy, ben, cat, dan, eve].map((user) => user.username);

// I follow Amy and Ben. Amy follows Cat and Dan; Ben follows Dan. So Dan (2) then Cat (1).
await valueOf(me.call.users.follow({ username: amy.username }));
await valueOf(me.call.users.follow({ username: ben.username }));
await valueOf(amy.call.users.follow({ username: dan.username }));
await valueOf(ben.call.users.follow({ username: dan.username }));
await db.insert(schema.userFollows).values({ followerId: amy.userId, followingId: cat.userId, status: "accepted" });

const suggested = async (who: ReturnType<typeof callAs>) =>
    (await valueOf(who.users.getSuggestedPeople({ limit: 20 }))).filter((person) => mine.includes(person.username));

describe("suggested people", () => {
    it("ranks people by how many of those I follow follow them, then popular public accounts", async () => {
        const people = await suggested(me.call);
        expect(people.slice(0, 2).map((person) => [person.username, person.followedByCount])).toEqual([[dan.username, 2], [cat.username, 1]]);
        expect(people.map((person) => person.username)).toContain(eve.username);
    });

    it("leaves out who I follow already, blocks and banned people", async () => {
        await valueOf(me.call.users.blockUser({ username: cat.username }));
        await db.update(schema.users).set({ banned: true }).where(eq(schema.users.id, eve.userId));
        const people = (await suggested(me.call)).map((person) => person.username);
        expect(people).not.toContain(amy.username);
        expect(people).not.toContain(cat.username);
        expect(people).not.toContain(eve.username);
        await valueOf(me.call.users.unblockUser({ username: cat.username }));
        await db.update(schema.users).set({ banned: false }).where(eq(schema.users.id, eve.userId));
    });

    it("signed out: only public accounts", async () => {
        const people = await suggested(callAs(null));
        expect(people.map((person) => person.followedByCount).every((count) => count === 0)).toBe(true);
        expect(people.map((person) => person.username)).not.toContain(cat.username);
    });
});

describe("suggested listings", () => {
    const listing = (title: string) => ({ id: newId(), content: title, listing: { title, description: title, condition: "used" as const, isNegotiable: false, type: "fixed" as const, priceCents: 1000 } });

    it("puts listings from people I follow first, then the newest; never mine", async () => {
        const fromAmy = await valueOf(amy.call.posts.createPost(listing("Amy's lamp")));
        const fromDan = await valueOf(dan.call.posts.createPost(listing("Dan's desk")));
        const own = await valueOf(me.call.posts.createPost(listing("My chair")));
        const ids = (await valueOf(me.call.postListings.getSuggested({ limit: 20 }))).map((post) => post.id);
        expect(ids[0]).toBe(fromAmy.id);
        expect(ids).toContain(fromDan.id);
        expect(ids).not.toContain(own.id);
    });
});

describe("chat suggestions", () => {
    it("are people I follow that I haven't messaged with yet", async () => {
        const withBen = await valueOf(me.call.chats.getOrCreateDirectChat({ id: newId(), username: ben.username }));
        // An empty chat (opened, nothing sent) doesn't count: it isn't in the inbox either.
        expect((await valueOf(me.call.chats.getSuggestions({ limit: 20 }))).map((person) => person.username).sort()).toEqual([amy.username, ben.username].sort());
        await valueOf(me.call.chats.sendMessage({ id: newId(), chatId: withBen.id, content: "Hi Ben" }));
        const people = (await valueOf(me.call.chats.getSuggestions({ limit: 20 }))).map((person) => person.username);
        expect(people).toEqual([amy.username]);
    });
});
