import type { NotificationType } from "../../types/notification";
import type { PushSetting } from "../../types/push";

const settings: Record<NotificationType, PushSetting | null> = {
    // The app's own messages always go: people need to know about a warning or a report's outcome.
    warning: null,
    report_resolved: null,
    followed: "pushFollows",
    follow_requested: "pushFollows",
    follow_accepted: "pushFollows",
    commented: "pushComments",
    mentioned: "pushMentions",
};

/** The setting that turns pushes of a notification type on or off; null for ones that always go. */
export function pushSettingFor(type: NotificationType): PushSetting | null {
    return settings[type];
}
