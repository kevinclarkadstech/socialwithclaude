import { serverConfig } from "../../../../config";
import { createConsoleEmailSender } from "../createConsoleEmailSender/createConsoleEmailSender";
import { createMailgunEmailSender } from "../createMailgunEmailSender/createMailgunEmailSender";
import { createResendEmailSender } from "../createResendEmailSender/createResendEmailSender";
import type { EmailSender } from "../types";

/**
 * How emails are delivered, by EMAIL_PROVIDER: logged locally ("console"), or
 * sent through Resend or Mailgun. The config check makes sure the chosen
 * provider's settings are all there. Another provider: implement EmailSender
 * and add it here.
 */
export const emailSender: EmailSender = (() => {
    const { EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_REGION } = serverConfig;
    if (EMAIL_PROVIDER === "resend") {
        return createResendEmailSender({ apiKey: RESEND_API_KEY!, from: EMAIL_FROM! });
    }
    if (EMAIL_PROVIDER === "mailgun") {
        return createMailgunEmailSender({ apiKey: MAILGUN_API_KEY!, domain: MAILGUN_DOMAIN!, region: MAILGUN_REGION, from: EMAIL_FROM! });
    }
    return createConsoleEmailSender();
})();
