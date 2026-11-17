import type { ReportedItem } from "@myapp/shared/domains";
import { findReportedItems } from "../../../internal/moderation/findReportedItems/findReportedItems";

/** The moderation queue: open (longest-waiting first) or resolved (most recent first). */
export async function getReportedItems({ status, limit }: { status: "open" | "resolved"; limit: number }): Promise<ReportedItem[]> {
    return findReportedItems({ status, limit });
}
