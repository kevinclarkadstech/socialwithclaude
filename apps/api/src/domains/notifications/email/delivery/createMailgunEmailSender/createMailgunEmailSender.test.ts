import { describe, expect, it, mock } from "bun:test";
import { createMailgunEmailSender } from "./createMailgunEmailSender";

const message = { to: "sam@example.com", subject: "Your sign-in code", text: "Your code is 123456." };
const settings = { apiKey: "key-test", domain: "mg.example.com", from: "App <no-reply@mg.example.com>" };

describe("createMailgunEmailSender", () => {
    it("posts a form to the domain's messages endpoint, with basic auth", async () => {
        const fetch = mock(async () => new Response(JSON.stringify({ id: "<x@mg>", message: "Queued" }), { status: 200 }));
        await createMailgunEmailSender({ ...settings, region: "us", fetch }).send(message);
        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
        expect(new Headers(init.headers).get("authorization")).toBe(`Basic ${btoa("api:key-test")}`);
        const form = init.body as URLSearchParams;
        expect(Object.fromEntries(form)).toEqual({ from: settings.from, to: "sam@example.com", subject: "Your sign-in code", text: "Your code is 123456." });
    });

    it("uses the EU host for an EU account", async () => {
        const fetch = mock(async () => new Response("{}", { status: 200 }));
        await createMailgunEmailSender({ ...settings, region: "eu", fetch }).send(message);
        expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://api.eu.mailgun.net/v3/mg.example.com/messages");
    });

    it("throws with Mailgun's status, and leaves out a body that isn't JSON", async () => {
        const fetch = mock(async () => new Response("Forbidden", { status: 401 }));
        expect(createMailgunEmailSender({ ...settings, region: "us", fetch }).send(message)).rejects.toThrow("Mailgun didn't send an email (HTTP 401)");
    });
});
