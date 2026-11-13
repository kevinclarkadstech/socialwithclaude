import type { PhotoFormat } from "@myapp/shared/media";

const readUint16 = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!;
const readUint32LE = (bytes: Uint8Array, at: number) =>
    (bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16) | (bytes[at + 3]! << 24)) >>> 0;
const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

/**
 * A copy of the photo without its metadata (EXIF, which can hold GPS
 * location, plus XMP, IPTC and comments), removed byte by byte without
 * decoding: cheap enough to run on every upload. The colour profile (ICC) is
 * kept, so colours look the same. Input must already have passed inspectPhoto.
 */
export function stripPhotoMetadata(bytes: Uint8Array, format: PhotoFormat): Uint8Array {
    return format === "jpeg" ? stripJpeg(bytes) : stripWebp(bytes);
}

// APP1 (EXIF, XMP), APP13 (IPTC / Photoshop) and COM (comments).
const JPEG_METADATA_MARKERS = new Set([0xe1, 0xed, 0xfe]);

function stripJpeg(bytes: Uint8Array): Uint8Array {
    const kept: Uint8Array[] = [bytes.subarray(0, 2)];
    let at = 2;
    while (at + 4 <= bytes.length) {
        const marker = bytes[at + 1]!;
        // From the start of scan on it's photo data: keep the rest as is.
        if (marker === 0xda) {
            break;
        }
        const end = at + 2 + readUint16(bytes, at + 2);
        if (!JPEG_METADATA_MARKERS.has(marker)) {
            kept.push(bytes.subarray(at, end));
        }
        at = end;
    }
    kept.push(bytes.subarray(at));
    return concat(kept);
}

// VP8X flags: EXIF and XMP present.
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

function stripWebp(bytes: Uint8Array): Uint8Array {
    // Only the extended format (VP8X) can carry metadata chunks.
    if (ascii(bytes, 12, 4) !== "VP8X") {
        return bytes;
    }
    const kept: Uint8Array[] = [];
    let at = 12;
    while (at + 8 <= bytes.length) {
        const id = ascii(bytes, at, 4);
        const size = readUint32LE(bytes, at + 4);
        // Chunks are padded to an even size.
        const end = Math.min(at + 8 + size + (size % 2), bytes.length);
        if (id !== "EXIF" && id !== "XMP ") {
            const chunk = bytes.slice(at, end);
            if (id === "VP8X") {
                chunk[8] = chunk[8]! & ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
            }
            kept.push(chunk);
        }
        at = end;
    }
    const body = concat(kept);
    const header = new Uint8Array(12);
    header.set(bytes.subarray(0, 4), 0);
    new DataView(header.buffer).setUint32(4, body.length + 4, true);
    header.set(bytes.subarray(8, 12), 8);
    return concat([header, body]);
}

function concat(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) {
        out.set(part, at);
        at += part.length;
    }
    return out;
}
