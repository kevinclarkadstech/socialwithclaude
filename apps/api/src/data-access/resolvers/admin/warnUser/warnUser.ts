import type { ReportKind, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { notificationDeliverAt } from "../../../internal/notifications/notificationDeliverAt/notificationDeliverAt";
import { notificationPushesDue } from "../../../internal/notifications/pushesDueAfterDelay/pushesDueAfterDelay";

/** Sends `userId` a "warning" notification and logs it, in one transaction. */
export async function warnUser({ userId, moderatorId, reason, note, kind, targetId }: {
    userId: string;
    moderatorId: string;
    reason: ReportReason;
    note: string | null;
    kind: ReportKind | null;
    targetId: string | null;
}): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.insert(schema.notifications).values({ userId, type: "warning", data: { reason, note, kind }, deliverAt: notificationDeliverAt() });
        await tx.insert(schema.moderationActions).values({
            action: "warn_user",
            subjectUserId: userId,
            targetKind: kind,
            targetId,
            note: note ? `${reason}: ${note}` : reason,
            createdBy: moderatorId,
        });
    });
    await notificationPushesDue();
}
