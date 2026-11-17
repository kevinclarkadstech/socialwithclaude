import type { ReportKind, ReportedItem } from "@myapp/shared/domains";
import { findReportedItems } from "../../../internal/admin/findReportedItems/findReportedItems";

/** One reported thing, with every report about it. Null if nobody reported it. */
export async function getReportedItem({ kind, targetId }: { kind: ReportKind; targetId: string }): Promise<ReportedItem | null> {
    const [item] = await findReportedItems({ target: { kind, targetId } });
    return item ?? null;
}
