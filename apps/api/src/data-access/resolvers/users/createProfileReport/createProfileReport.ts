import type { ProfileReport, ReportReason, UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toProfileReport } from "../../../mappers/users/toProfileReport/toProfileReport";

/**
 * Reports a person, keeping `snapshot` (their profile as it is now).
 * Reporting the same person again replaces the reason, details and snapshot.
 */
export async function createProfileReport({ id, userId, reportedUserId, reason, details, snapshot }: {
    id: string;
    userId: string;
    reportedUserId: string;
    reason: ReportReason;
    details: string | null;
    snapshot: UserProfile;
}): Promise<ProfileReport> {
    const [row] = await db
        .insert(schema.profileReports)
        .values({ id, reportedUserId, reason, details, snapshot, createdBy: userId, updatedBy: userId })
        .onConflictDoUpdate({
            target: [schema.profileReports.createdBy, schema.profileReports.reportedUserId],
            set: { reason, details, snapshot, updatedBy: userId, updatedAt: new Date() },
        })
        .returning();
    return toProfileReport(row!);
}
