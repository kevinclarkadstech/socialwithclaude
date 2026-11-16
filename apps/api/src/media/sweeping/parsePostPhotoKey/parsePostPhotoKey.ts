import { postPhotoSizes } from "@myapp/shared/domains";

// userId/postId/photoId-size (see photoKey), with ULIDs and a post photo size.
const POST_PHOTO_KEY = /^([0-9A-Z]{26})\/([0-9A-Z]{26})\/([0-9A-Z]{26})-(\d+)$/;

/**
 * The post and photo a media key belongs to, if it's a post photo's file
 * (profile photos and anything else give null). Only post photos are keyed
 * this way today; if comments or chats get photos under the same shape,
 * this needs telling them apart.
 */
export function parsePostPhotoKey(key: string): { userId: string; postId: string; photoId: string; size: number } | null {
    const match = POST_PHOTO_KEY.exec(key);
    if (!match) {
        return null;
    }
    const size = Number(match[4]);
    if (!(postPhotoSizes as readonly number[]).includes(size)) {
        return null;
    }
    return { userId: match[1]!, postId: match[2]!, photoId: match[3]!, size };
}
