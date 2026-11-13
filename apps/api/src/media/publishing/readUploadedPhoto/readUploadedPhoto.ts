import { maxPhotoUploadBytes } from "@myapp/shared/common/photos";
import type { Storage } from "../../../storage";
import type { ReadUploadedPhotoResult, UploadedPhotoFile } from "../../types";
import { inspectPhoto } from "../../photos/inspectPhoto/inspectPhoto";

/**
 * Reads every file of one uploaded photo (one per size) and checks each is a
 * JPEG or WebP within the size limit. What sizes and shape it must have is up
 * to the caller.
 */
export async function readUploadedPhoto({ storage, uploadKeys }: {
    storage: Pick<Storage, "readUpload">;
    uploadKeys: string[];
}): Promise<ReadUploadedPhotoResult> {
    const files: UploadedPhotoFile[] = [];
    for (const uploadKey of uploadKeys) {
        const bytes = await storage.readUpload({ key: uploadKey });
        if (!bytes) {
            return { ok: false, reason: "missing", uploadKey };
        }
        const info = inspectPhoto(bytes);
        if (!info || bytes.length > maxPhotoUploadBytes) {
            return { ok: false, reason: "unusable", uploadKey };
        }
        files.push({ uploadKey, bytes, info });
    }
    return { ok: true, files };
}
