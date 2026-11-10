import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostCommentViewSchema } from "./post-comment";
import { ReportReasonSchema, ReportStatusSchema } from "./report";

/** created_by is the reporter. `snapshot` is the comment as it was when reported. */
export const PostCommentReportSchema = BaseUserCreatedEntitySchema.extend({
    postCommentId: z.ulid(),
    reason: ReportReasonSchema,
    details: z.string().trim().max(1000).nullable(),
    status: ReportStatusSchema,
    snapshot: PostCommentViewSchema.omit({ viewer: true }),
});

export type PostCommentReport = z.infer<typeof PostCommentReportSchema>;
