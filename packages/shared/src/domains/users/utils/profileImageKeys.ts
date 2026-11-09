import { profileImageAspectRatios } from "../constants";
import type { ProfileImageKind } from "../types/profile-image";

/**
 * Where a profile image is published in the media bucket. Fixed per user, so
 * no database field is needed: URLs add ?v=<profile updatedAt> to bust caches.
 */
export const profileImageKey = ({ userId, kind, width }: { userId: string; kind: ProfileImageKind; width: number }) =>
    `users/${userId}/${kind}-${width}`;

/** Where an upload of one width lands in the (private) uploads bucket, under the uploader's id. */
export const profileImageUploadKey = ({ userId, uploadId, kind, width }: {
    userId: string;
    uploadId: string;
    kind: ProfileImageKind;
    width: number;
}) => `${userId}/${uploadId}/${kind}-${width}`;

/** The height a profile image of `width` has (covers are 3:1). */
export const profileImageHeight = ({ kind, width }: { kind: ProfileImageKind; width: number }) =>
    Math.round(width / profileImageAspectRatios[kind]);
