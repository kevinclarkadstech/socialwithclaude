import { profilePhotoKey, profilePhotoUploadKey, profilePhotoWidths, type ProfilePhotoKind, type PublishProfilePhotoResult } from "@myapp/shared/domains";
import type { Storage } from "../../../storage";
import { findProfilePhotoProblem } from "../../checks/findProfilePhotoProblem/findProfilePhotoProblem";
import { publishPhotoFiles } from "../../publishing/publishPhotoFiles/publishPhotoFiles";
import { readUploadedPhoto } from "../../publishing/readUploadedPhoto/readUploadedPhoto";

/**
 * Publishes a newly uploaded avatar or cover: every width must be there and be
 * exactly that size, or nothing is published. Each is stripped of metadata and
 * published at the user's fixed key. The uploads are deleted either way.
 */
export async function publishProfilePhoto({ storage, userId, kind, uploadId }: {
    storage: Pick<Storage, "readUpload" | "putMedia" | "deleteUploads">;
    userId: string;
    kind: ProfilePhotoKind;
    uploadId: string;
}): Promise<PublishProfilePhotoResult> {
    const widths = profilePhotoWidths[kind];
    const uploadKeys = widths.map((width) => profilePhotoUploadKey({ userId, uploadId, kind, width }));
    const read = await readUploadedPhoto({ storage, uploadKeys });
    const problem = read.ok ? findProfilePhotoProblem({ kind, files: read.files }) : null;
    if (read.ok && !problem) {
        await publishPhotoFiles({
            storage,
            files: read.files.map((file, index) => ({ ...file, mediaKey: profilePhotoKey({ userId, kind, width: widths[index]! }) })),
        });
    }
    // Whatever arrived is no use now, published or not.
    await storage.deleteUploads({ keys: uploadKeys });
    if (!read.ok) {
        return { status: read.reason, detail: read.uploadKey };
    }
    return problem ? { status: "unusable", detail: problem } : { status: "published" };
}
