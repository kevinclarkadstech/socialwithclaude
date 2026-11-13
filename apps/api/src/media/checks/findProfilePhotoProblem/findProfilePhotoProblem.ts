import { profilePhotoHeight, profilePhotoWidths, type ProfilePhotoKind } from "@myapp/shared/domains";
import type { UploadedPhotoFile } from "../../types";

/** Why a profile photo's files (one per width, in order) aren't the expected sizes, or null if they are. */
export function findProfilePhotoProblem({ kind, files }: { kind: ProfilePhotoKind; files: UploadedPhotoFile[] }): string | null {
    for (const [index, file] of files.entries()) {
        const width = profilePhotoWidths[kind][index]!;
        // Rounding on the device can be a pixel off.
        if (file.info.width !== width || Math.abs(file.info.height - profilePhotoHeight({ kind, width })) > 1) {
            return `width ${width} is ${file.info.width}x${file.info.height}`;
        }
    }
    return null;
}
