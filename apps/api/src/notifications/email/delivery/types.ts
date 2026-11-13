/** One email to one recipient. `text` is required; `html` is the optional rich version of it. */
export interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/** Delivers emails. The only provider-specific part of notifications. */
export interface EmailSender {
    send(message: EmailMessage): Promise<void>;
    /** Throws if this sender can't really deliver here (called at startup, so a deploy fails early). */
    assertCanSend(): void;
}
