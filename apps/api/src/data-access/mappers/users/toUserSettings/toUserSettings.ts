import type { UserSettings } from "@myapp/shared/domains";

import type { UserSettingsRow } from "../../types";

export function toUserSettings(row: UserSettingsRow): UserSettings {
    return {
        userId: row.userId,
        darkModeEnabled: row.darkModeEnabled,
        followersCanTag: row.followersCanTag,
        nonFollowersCanTag: row.nonFollowersCanTag,
        profileVisibility: row.profileVisibility,
        pushMessages: row.pushMessages,
        pushComments: row.pushComments,
        pushMentions: row.pushMentions,
        pushFollows: row.pushFollows,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
