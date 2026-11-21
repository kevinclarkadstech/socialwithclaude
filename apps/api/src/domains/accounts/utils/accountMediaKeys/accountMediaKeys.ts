import { photoKeys } from "@myapp/shared/media";
import { postCommentPhotoKeys, postPhotoSizes, profilePhotoKey, profilePhotoWidths, type ProfilePhotoKind } from "@myapp/shared/domains";
import type { AccountForPurge } from "../../../../data-access";

/** Every published file that goes with an account: its profile photos, its posts' photos, and the comment photos going with it. */
export function accountMediaKeys(account: Pick<AccountForPurge, "userId" | "postPhotos" | "commentPhotos">): string[] {
    const kinds = Object.keys(profilePhotoWidths) as ProfilePhotoKind[];
    return [
        ...kinds.flatMap((kind) => profilePhotoWidths[kind].map((width) => profilePhotoKey({ userId: account.userId, kind, width }))),
        ...account.postPhotos.flatMap((photo) => photoKeys({ userId: account.userId, parentId: photo.postId, photoId: photo.id, sizes: postPhotoSizes })),
        ...account.commentPhotos.flatMap((photo) => postCommentPhotoKeys(photo)),
    ];
}
