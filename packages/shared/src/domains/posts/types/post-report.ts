import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostViewSchema } from "./post";
import { ReportReasonSchema, ReportStatusSchema } from "./report";

/** created_by is the reporter. `snapshot` is the post as it was when reported. */
export const PostReportSchema = BaseUserCreatedEntitySchema.extend({
    postId: z.ulid(),
    reason: ReportReasonSchema,
    details: z.string().trim().max(1000).nullable(),
    status: ReportStatusSchema,
    snapshot: PostViewSchema.omit({ viewer: true }),
});

export type PostReport = z.infer<typeof PostReportSchema>;
