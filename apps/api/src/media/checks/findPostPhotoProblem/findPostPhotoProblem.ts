import { longSideDimensions } from "@myapp/shared/common/photos";
import { maxPhotoAspectRatio, postPhotoSizes } from "@myapp/shared/domains";
import type { UploadedPhotoFile } from "../../types";

/** Why one photo's files (smallest to largest) aren't usable as a post photo, or null if they are. */
export function findPostPhotoProblem(files: UploadedPhotoFile[]): string | null {
    for (const [index, file] of files.entries()) {
        if (Math.max(file.info.width, file.info.height) !== postPhotoSizes[index]) {
            return `size ${postPhotoSizes[index]} unusable`;
        }
    }
    // The largest size sets the shape; the others must match it (rounding on the device can be a pixel off).
    const largest = files[files.length - 1]!.info;
    if (Math.max(largest.width, largest.height) / Math.min(largest.width, largest.height) > maxPhotoAspectRatio) {
        return "too long and thin";
    }
    for (const [index, file] of files.entries()) {
        const expected = longSideDimensions({ width: largest.width, height: largest.height, size: postPhotoSizes[index]! });
        if (Math.abs(file.info.width - expected.width) > 1 || Math.abs(file.info.height - expected.height) > 1) {
            return `size ${postPhotoSizes[index]} a different shape`;
        }
    }
    return null;
}
