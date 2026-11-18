import { accountDeletionGraceDays } from "../../constants";

/** When an account scheduled for deletion at `scheduledAt` is deleted for good. */
export function accountDeletesAt(scheduledAt: Date): Date {
    return new Date(scheduledAt.getTime() + accountDeletionGraceDays * 24 * 60 * 60 * 1000);
}
