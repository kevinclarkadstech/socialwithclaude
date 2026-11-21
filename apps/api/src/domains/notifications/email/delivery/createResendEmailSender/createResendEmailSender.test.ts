import { describe, expect, it, mock } from "bun:test";
import { createResendEmailSender } from "./createResendEmailSender";

const message = { to: "sam@example.com", subject: "Your sign-in code", text: "Your code is 123456.", html: "<p>123456</p>" };

describe("createResendEmailSender", () => {
    it("posts the email to Resend with the API key", async () => {
        const fetch = mock(async () => new Response(JSON.stringify({ id: "abc" }), { status: 200 }));
        await createResendEmailSender({ apiKey: "re_test", from: "App <no-reply@mail.example.com>", fetch }).send(message);
        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("https://api.resend.com/emails");
        expect(new Headers(init.headers).get("authorization")).toBe("Bearer re_test");
        expect(JSON.parse(init.body as string)).toEqual({
            from: "App <no-reply@mail.example.com>",
            to: ["sam@example.com"],
            subject: "Your sign-in code",
            text: "Your code is 123456.",
            html: "<p>123456</p>",
        });
    });

    it("throws with Resend's status and reason, without the email's contents", async () => {
        const fetch = mock(async () => new Response(JSON.stringify({ name: "validation_error", message: "The domain is not verified" }), { status: 403 }));
        const sending = createResendEmailSender({ apiKey: "re_test", from: "a@b.c", fetch }).send(message);
        expect(sending).rejects.toThrow("Resend didn't send an email (HTTP 403): The domain is not verified");
        await sending.catch((error: Error) => expect(error.message).not.toContain("123456"));
    });
});
