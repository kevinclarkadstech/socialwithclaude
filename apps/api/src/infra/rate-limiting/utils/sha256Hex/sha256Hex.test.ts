import { expect, test } from "bun:test";

import { sha256Hex } from "./sha256Hex";

test("sha256Hex returns the lowercase hex digest", async () => {
    const digest = await sha256Hex("abc");
    expect(digest).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
