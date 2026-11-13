import { emailSender } from "../../email/delivery/emailSender/emailSender";

/** Throws while notifications can't really be sent here, e.g. no email provider in production. Called at startup, so a deploy fails early. */
export function assertCanNotify() {
    emailSender.assertCanSend();
}
