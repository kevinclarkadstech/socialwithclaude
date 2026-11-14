import { expect, test } from "bun:test";

import { redactQueryParams } from "./redactQueryParams";

test("removes the bound values from a failed query message", () => {
    const redacted = redactQueryParams("Failed query: select * from \"users\" where \"email\" = $1\nparams: someone@example.com,2");
    expect(redacted).toBe("Failed query: select * from \"users\" where \"email\" = $1\nparams: [redacted]");
});

test("leaves other messages alone", () => {
    expect(redactQueryParams("Connection terminated unexpectedly")).toBe("Connection terminated unexpectedly");
});
