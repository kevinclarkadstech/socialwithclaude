import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const maya = await createTestUser({ name: "maya", firstName: "Maya" });
const mark = await createTestUser({ name: "mark", firstName: "Mark", lastName: "Thompson" });
const marco = await createTestUser({ name: "marco", firstName: "Marco" });
const marksPost = newId();
await mark.call.posts.createPost({ id: marksPost, content: "Road bike, 54cm" });

const savedIds = async () => (await valueOf(maya.call.users.getMySaves({ limit: 20 }))).items.map((save) => (save.type === "post" ? save.post.id : null));
const usernames = (users: { username: string }[]) => users.map((user) => user.username);

describe("saves", () => {
    it("hide a blocked person's items while the block lasts, and keep the save", async () => {
        await maya.call.posts.save({ postId: marksPost });
        expect(await savedIds()).toEqual([marksPost]);
        await mark.call.users.blockUser({ username: maya.username });
        expect(await savedIds()).toEqual([]);
        await mark.call.users.unblockUser({ username: maya.username });
        expect(await savedIds()).toEqual([marksPost]);
    });
});

describe("people search and mention suggestions", () => {
    it("match the start of a username or name, not the middle", async () => {
        expect(usernames(await valueOf(maya.call.users.search({ query: mark.username })))).toEqual([mark.username]);
        expect(usernames(await valueOf(maya.call.users.search({ query: "thomp" })))).toContain(mark.username);
        expect(usernames(await valueOf(maya.call.users.search({ query: "hompson" })))).not.toContain(mark.username);
    });

    it("suggest people you follow first, never yourself", async () => {
        await maya.call.users.follow({ username: marco.username });
        const suggested = usernames(await valueOf(maya.call.users.suggestMentions({ query: "mar" })));
        expect(suggested.indexOf(marco.username)).toBeLessThan(suggested.indexOf(mark.username));
        expect(usernames(await valueOf(maya.call.users.suggestMentions({ query: "may" })))).not.toContain(maya.username);
    });
});
