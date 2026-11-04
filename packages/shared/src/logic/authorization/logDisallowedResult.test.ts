import { describe, expect, it, mock } from "bun:test";
import type { AppLogger } from "../../observability";
import { mockCaller, mockPost, mockProfile, userId2 } from "../../testing/fixtures";
import { logDisallowedResult } from "./logDisallowedResult";
import { canUpdatePost } from "./posts/canUpdatePost";
import { canFollowUser } from "./users/canFollowUser";

function spyLogger() {
    const logger = {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
        child: (): AppLogger => logger,
        setBindings: () => {},
    };
    return logger;
}

function logged(result: ReturnType<typeof canUpdatePost>) {
    if (result.ok) throw new Error("expected a failure");
    const logger = spyLogger();
    logDisallowedResult(logger, result, { action: "update-post", callerId: undefined });
    return logger;
}

describe("logDisallowedResult", () => {
    it("logs routine failures as info", () => {
        expect(logged(canUpdatePost(null, mockPost())).info).toHaveBeenCalledTimes(1);
        expect(logged(canUpdatePost(mockCaller({ profile: null }), mockPost())).info).toHaveBeenCalledTimes(1);
    });

    it("logs likely client bugs as warn", () => {
        const logger = logged(canFollowUser(mockCaller(), mockProfile()));
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it("logs requests the app never sends as error, with the reason", () => {
        const logger = logged(canUpdatePost(mockCaller({ userId: userId2 }), mockPost()));
        expect(logger.error).toHaveBeenCalledWith(
            "Disallowed update-post",
            expect.objectContaining({ event: "authorization.disallowed", reason: "not-creator" }),
        );
    });
});
