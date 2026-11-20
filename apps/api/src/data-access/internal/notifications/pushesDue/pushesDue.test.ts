import { afterEach, expect, mock, test } from "bun:test";
import { pushesDue, setPushesDueListener } from "./pushesDue";

afterEach(() => setPushesDueListener(null));

test("tells the listener when pushes are due, and does nothing without one", async () => {
    await pushesDue({ inSeconds: 30 });
    const listener = mock(async () => {});
    setPushesDueListener(listener);
    await pushesDue({ inSeconds: 10 });
    expect(listener.mock.calls).toEqual([[{ inSeconds: 10 }]] as never);
});
