import { describe, expect, it, mock } from "bun:test";
import { silentLogger } from "../../testing/context";
import { bestEffort } from "./bestEffort";

describe("bestEffort", () => {
    it("logs a failure instead of throwing it", async () => {
        const error = mock(() => {});
        await bestEffort({ logger: { ...silentLogger, error }, what: "send notifications", run: async () => { throw new Error("db down"); } });
        expect(error).toHaveBeenCalledWith("Couldn't send notifications", expect.objectContaining({ err: expect.any(Error) }));
    });
});
