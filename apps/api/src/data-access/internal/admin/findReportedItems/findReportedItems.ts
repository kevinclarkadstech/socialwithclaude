import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { ModerationSubject, ReportEntry, ReportKind, ReportedItem } from "@myapp/shared/domains";
import { reportKinds } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toDeletedModerationSubject, toModerationSubject } from "../../../mappers/admin/toModerationSubject/toModerationSubject";
import { moderationHistory } from "../moderationHistory/moderationHistory";

/**
 * Each report table, as the queue reads it: the column naming what was
 * reported, and who it's about (the author, from the snapshot, so it
 * survives the thing being deleted; for a profile, the reported person).
 */
const sources = {
    post: {
        table: schema.postReports,
        targetId: schema.postReports.postId,
        subjectId: sql<string>`${schema.postReports.snapshot}->>'createdBy'`,
    },
    postComment: {
        table: schema.postCommentReports,
        targetId: schema.postCommentReports.postCommentId,
        subjectId: sql<string>`${schema.postCommentReports.snapshot}->>'createdBy'`,
    },
    profile: {
        table: schema.profileReports,
        targetId: schema.profileReports.reportedUserId,
        subjectId: sql<string>`${schema.profileReports.reportedUserId}`,
    },
    chatMessage: {
        table: schema.chatMessageReports,
        targetId: schema.chatMessageReports.chatMessageId,
        subjectId: sql<string>`${schema.chatMessageReports.snapshot}->'message'->>'createdBy'`,
    },
} satisfies Record<ReportKind, unknown>;

type Target = { kind: ReportKind; targetId: string };

/**
 * Reported things for the moderation queue, one per thing, each with its
 * reports (newest first) and whoever it's about.
 * - `status` "open": things with an open report, longest-waiting first, with only their open reports.
 * - `status` "resolved": things with none open, most recently settled first, with every report.
 * - `target`: that one thing, whatever its status, with every report.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function findReportedItems(args: { status: "open" | "resolved"; limit: number } | { target: Target }): Promise<ReportedItem[]> {
    const targets = await findTargets(args);
    if (targets.length === 0) {
        return [];
    }
    const openOnly = "status" in args && args.status === "open";
    const reports = await findReports({ targets, openOnly });
    const subjects = await findSubjects([...new Set(reports.map((report) => report.subjectId))]);

    return targets.flatMap(({ kind, targetId, isOpen }) => {
        const own = reports.filter((report) => report.kind === kind && report.targetId === targetId);
        const newest = own[0];
        const subject = newest ? subjects.get(newest.subjectId) : undefined;
        if (!newest || !subject) {
            return [];
        }
        const entries: ReportEntry[] = own.map((report) => report.entry);
        const fields = {
            targetId,
            subject,
            reports: entries,
            firstReportedAt: own.at(-1)!.entry.createdAt,
            lastReportedAt: newest.entry.createdAt,
            isOpen,
        };
        // Each kind's snapshot has its own shape: what was stored for that kind.
        return [{ kind, snapshot: newest.snapshot, ...fields } as ReportedItem];
    });
}

/** Every report, from all four tables, as one list (for grouping by what was reported). */
function allReports() {
    return sql.join(
        reportKinds.map((kind) => {
            const source = sources[kind];
            return sql`select ${sql.raw(`'${kind}'`)} as kind, ${source.targetId} as target_id, status, created_at, updated_at from ${source.table}`;
        }),
        sql` union all `,
    );
}

async function findTargets(args: { status: "open" | "resolved"; limit: number } | { target: Target }): Promise<(Target & { isOpen: boolean })[]> {
    let rest: SQL;
    if ("target" in args) {
        rest = sql`where kind = ${args.target.kind} and target_id = ${args.target.targetId} group by kind, target_id`;
    } else if (args.status === "open") {
        rest = sql`group by kind, target_id having bool_or(status = 'open')
            order by min(created_at) filter (where status = 'open'), kind, target_id limit ${args.limit}`;
    } else {
        rest = sql`group by kind, target_id having not bool_or(status = 'open')
            order by max(updated_at) desc, kind, target_id limit ${args.limit}`;
    }
    const result = await db.execute<{ kind: ReportKind; target_id: string; is_open: boolean }>(
        sql`with reports as (${allReports()}) select kind, target_id, bool_or(status = 'open') as is_open from reports ${rest}`,
    );
    return result.rows.map((row) => ({ kind: row.kind, targetId: row.target_id, isOpen: row.is_open }));
}

/** The reports about `targets`, newest first, with their reporters. */
async function findReports({ targets, openOnly }: { targets: Target[]; openOnly: boolean }) {
    const byKind = await Promise.all(reportKinds.map(async (kind) => {
        const ids = targets.filter((target) => target.kind === kind).map((target) => target.targetId);
        if (ids.length === 0) {
            return [];
        }
        const source = sources[kind];
        const rows = await db
            .select({
                id: source.table.id,
                targetId: source.targetId,
                subjectId: source.subjectId,
                reason: source.table.reason,
                details: source.table.details,
                status: source.table.status,
                snapshot: source.table.snapshot,
                createdAt: source.table.createdAt,
                reporter: creatorFields,
            })
            .from(source.table)
            .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, source.table.createdBy))
            .where(and(inArray(source.targetId, ids), openOnly ? eq(source.table.status, "open") : undefined))
            .orderBy(desc(source.table.createdAt), desc(source.table.id));
        return rows.map((row) => ({
            kind,
            targetId: row.targetId,
            subjectId: row.subjectId,
            snapshot: row.snapshot,
            entry: {
                id: row.id,
                reason: row.reason,
                details: row.details,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
                reporter: row.reporter ? toCreator(row.reporter) : null,
            } satisfies ReportEntry,
        }));
    }));
    return byKind.flat();
}

/**
 * Who each report is about, by user id, with their ban (a ban that has ended
 * counts as none). Someone whose account was deleted is still there, as deleted.
 */
async function findSubjects(userIds: string[]): Promise<Map<string, ModerationSubject>> {
    if (userIds.length === 0) {
        return new Map();
    }
    const rows = await db
        .select({
            userId: schema.users.id,
            username: schema.userProfiles.username,
            role: schema.users.role,
            banned: schema.users.banned,
            banExpires: schema.users.banExpires,
            history: moderationHistory(schema.users.id),
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(inArray(schema.users.id, userIds));
    const subjects = new Map(rows.map((row) => [row.userId, toModerationSubject(row)]));
    const deletedIds = userIds.filter((userId) => !subjects.has(userId));
    if (deletedIds.length > 0) {
        const deleted = await db
            .select({ userId: sql<string>`s.id`, history: moderationHistory(sql`s.id`) })
            .from(sql`unnest(array[${sql.join(deletedIds.map((id) => sql`${id}`), sql`, `)}]::text[]) as s(id)`);
        for (const row of deleted) {
            subjects.set(row.userId, toDeletedModerationSubject(row));
        }
    }
    return subjects;
}

