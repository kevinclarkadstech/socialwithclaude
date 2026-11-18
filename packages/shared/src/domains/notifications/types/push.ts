import z from "zod";

/** The kind of device a push token is for. */
export const PushPlatformSchema = z.enum(["ios", "android"]);

export type PushPlatform = z.infer<typeof PushPlatformSchema>;

/**
 * The user setting that turns pushes of a kind on or off (see
 * UserSettings): new chat messages, comments on your posts, mentions, and
 * follows (new followers, requests and accepted requests).
 */
export type PushSetting = "pushMessages" | "pushComments" | "pushMentions" | "pushFollows";

/**
 * One push notification to one device: what it says, where tapping it goes
 * (`path`, an app route), and `collapseId`, which makes a newer push with
 * the same id replace this one on the device (one per chat).
 */
export interface PushMessage {
    token: string;
    title: string;
    body: string;
    path: string | null;
    collapseId: string | null;
    // The app icon's badge on iOS: unread notifications. Null leaves it as it is.
    badge: number | null;
}
