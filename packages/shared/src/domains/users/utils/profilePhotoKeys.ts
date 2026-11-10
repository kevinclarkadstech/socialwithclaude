import { profilePhotoAspectRatios } from "../constants";
import type { ProfilePhotoKind } from "../types/profile-photo";

/**
 * Where a profile photo is published in the media bucket. Fixed per user, so
 * no database field is needed: URLs add ?v=<profile updatedAt> to bust caches.
 */
export const profilePhotoKey = ({ userId, kind, width }: { userId: string; kind: ProfilePhotoKind; width: number }) =>
    `users/${userId}/${kind}-${width}`;

/** Where an upload of one width lands in the (private) uploads bucket, under the uploader's id. */
export const profilePhotoUploadKey = ({ userId, uploadId, kind, width }: {
    userId: string;
    uploadId: string;
    kind: ProfilePhotoKind;
    width: number;
}) => `${userId}/${uploadId}/${kind}-${width}`;

/** The height a profile photo of `width` has (covers are 3:1). */
export const profilePhotoHeight = ({ kind, width }: { kind: ProfilePhotoKind; width: number }) =>
    Math.round(width / profilePhotoAspectRatios[kind]);
