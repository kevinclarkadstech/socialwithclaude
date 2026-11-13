import type { PhotoFormat } from "@myapp/shared/common/photos";

export interface PhotoInfo {
    format: PhotoFormat;
    width: number;
    height: number;
}

/** One file of an uploaded photo, read and recognised. */
export type UploadedPhotoFile = { uploadKey: string; bytes: Uint8Array; info: PhotoInfo };

export type ReadUploadedPhotoResult =
    | { ok: true; files: UploadedPhotoFile[] }
    | { ok: false; reason: "missing" | "unusable"; uploadKey: string };
