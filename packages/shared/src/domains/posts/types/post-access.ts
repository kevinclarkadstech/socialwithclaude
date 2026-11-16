import z from "zod";
import { ProfileVisibilitySchema } from "../../users/types/user-settings";
import { PostSchema, PostViewerSchema } from "./post";

/**
 * Just what deciding who can see a post takes (canViewPost): who made it,
 * whether their profile is public, and whether the caller follows them. A
 * PostView has all of it; getPostAccessById loads only this, for checks on
 * things under a post (its comments) that don't show the post itself.
 */
export const PostAccessSchema = z.object({
    id: PostSchema.shape.id,
    createdBy: PostSchema.shape.createdBy,
    creator: z.object({ profileVisibility: ProfileVisibilitySchema }),
    viewer: PostViewerSchema.pick({ followsCreator: true }),
});

export type PostAccess = z.infer<typeof PostAccessSchema>;
