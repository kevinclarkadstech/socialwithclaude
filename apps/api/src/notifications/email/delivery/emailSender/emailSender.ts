import { createConsoleEmailSender } from "../createConsoleEmailSender/createConsoleEmailSender";
import type { EmailSender } from "../types";

/** How emails are delivered. To use a provider (Resend, SES, Postmark…), implement EmailSender and swap it in here. */
export const emailSender: EmailSender = createConsoleEmailSender();
