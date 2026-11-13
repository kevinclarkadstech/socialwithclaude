import { photoContentTypes } from "@myapp/shared/common/photos";
import type { Storage } from "../../../storage";
import { stripPhotoMetadata } from "../../photos/stripPhotoMetadata/stripPhotoMetadata";
import type { UploadedPhotoFile } from "../../types";

/** Publishes checked files to the media bucket, each stripped of its metadata (EXIF location and the like). */
export async function publishPhotoFiles({ storage, files }: {
    storage: Pick<Storage, "putMedia">;
    files: (UploadedPhotoFile & { mediaKey: string })[];
}): Promise<void> {
    await Promise.all(files.map((file) => storage.putMedia({
        key: file.mediaKey,
        bytes: stripPhotoMetadata(file.bytes, file.info.format),
        contentType: photoContentTypes[file.info.format],
    })));
}
