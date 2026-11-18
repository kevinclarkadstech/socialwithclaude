import { describe, expect, it } from "bun:test";
import { pushSettingFor } from "./pushSettingFor";

describe("pushSettingFor", () => {
    it("maps each type to its setting, and the app's own to none (they always go)", () => {
        expect(pushSettingFor("commented")).toBe("pushComments");
        expect(pushSettingFor("mentioned")).toBe("pushMentions");
        expect(pushSettingFor("follow_requested")).toBe("pushFollows");
        expect(pushSettingFor("warning")).toBeNull();
        expect(pushSettingFor("report_resolved")).toBeNull();
    });
});
