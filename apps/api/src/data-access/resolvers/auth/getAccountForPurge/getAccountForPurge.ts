import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/** What deleting an account for good needs to know before its rows go. */
export interface AccountForPurge {
    userId: string;
    email: string;
    // Banned right now: their email is kept (hashed) so they can't sign up again.
    isBanned: boolean;
    // Every photo on their posts, for deleting the files.
    postPhotos: { postId: string; id: string }[];
    // Every comment photo going with them: on their comments, and on anyone's comments on their posts.
    commentPhotos: { id: string; createdBy: string; postCommentId: string }[];
    // Their Sign in with Apple tokens, if any, to revoke with Apple.
    appleTokens: { refreshToken: string | null; accessToken: string | null }[];
}

/** An account's details for purgeAccount. Null if there's no such user. */
export async function getAccountForPurge({ userId }: { userId: string }): Promise<AccountForPurge | null> {
    const [user] = await db
        .select({
            email: schema.users.email,
            isBanned: sql<boolean>`${schema.users.banned} and (${schema.users.banExpires} is null or ${schema.users.banExpires} > now())`,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId));
    if (!user) {
        return null;
    }
    const ownPosts = db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.createdBy, userId));
    const [postPhotos, commentPhotos, appleTokens] = await Promise.all([
        db
            .select({ postId: schema.postMedia.postId, id: schema.postMedia.id })
            .from(schema.postMedia)
            .where(inArray(schema.postMedia.postId, ownPosts)),
        db
            .select({ id: schema.postCommentPhotos.id, createdBy: schema.postCommentPhotos.createdBy, postCommentId: schema.postCommentPhotos.postCommentId })
            .from(schema.postCommentPhotos)
            .innerJoin(schema.postComments, eq(schema.postComments.id, schema.postCommentPhotos.postCommentId))
            .where(or(eq(schema.postComments.createdBy, userId), inArray(schema.postComments.postId, ownPosts))),
        db
            .select({ refreshToken: schema.accounts.refreshToken, accessToken: schema.accounts.accessToken })
            .from(schema.accounts)
            .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, "apple"))),
    ]);
    return { userId, email: user.email, isBanned: user.isBanned, postPhotos, commentPhotos, appleTokens };
}
