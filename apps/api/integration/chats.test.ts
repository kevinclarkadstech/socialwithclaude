import { describe, expect, it } from "bun:test";
import { newId } from "../src/data-access/db";
import { createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

// The tests run in order and build on each other.
const sam = await createTestUser({ name: "sam" });
const maya = await createTestUser({ name: "maya" });
const jo = await createTestUser({ name: "jo" });
const chat = await valueOf(sam.call.chats.getOrCreateDirectChat({ id: newId(), username: maya.username }));
await sam.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Is the bike still available?" });

const found = async (who: typeof sam, query: string) => (await valueOf(who.call.chats.search({ query, limit: 20 }))).items.map((result) => result.message.content);

describe("chats", () => {
    it("are only open to their members", async () => {
        expect(await outcome(jo.call.chats.getMessages({ chatId: chat.id, limit: 20 }))).toBe("NOT_FOUND");
        expect(await outcome(jo.call.chats.sendMessage({ id: newId(), chatId: chat.id, content: "Hi" }))).toBe("NOT_FOUND");
    });

    it("search finds messages in your own chats only", async () => {
        expect(await found(sam, "BIKE")).toEqual(["Is the bike still available?"]);
        expect(await found(maya, "bike")).toEqual(["Is the bike still available?"]);
        expect(await found(jo, "bike")).toEqual([]);
    });

    it("search leaves out what you cleared, for you only", async () => {
        await sam.call.chats.deleteChat({ chatId: chat.id });
        expect(await found(sam, "bike")).toEqual([]);
        expect(await found(maya, "bike")).toEqual(["Is the bike still available?"]);
    });
});
