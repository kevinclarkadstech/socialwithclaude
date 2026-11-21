import type { PhotoInfo } from "../../types";


const readUint16 = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!;
const readUint16LE = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8);
const readUint24LE = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

/**
 * The format and pixel size of a JPEG or WebP, read from its header without
 * decoding it. Null for anything else, or a header that doesn't hold up.
 */
export function inspectPhoto(bytes: Uint8Array): PhotoInfo | null {
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        return inspectJpeg(bytes);
    }
    if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
        return inspectWebp(bytes);
    }
    return null;
}

/** JPEG: walk the segments to the frame header (SOFn), which holds the size. */
function inspectJpeg(bytes: Uint8Array): PhotoInfo | null {
    let at = 2;
    while (at + 4 <= bytes.length) {
        if (bytes[at] !== 0xff) {
            return null;
        }
        const marker = bytes[at + 1]!;
        // Padding bytes and markers without a length.
        if (marker === 0xff) {
            at += 1;
            continue;
        }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
            at += 2;
            continue;
        }
        const length = readUint16(bytes, at + 2);
        // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
        const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrameHeader) {
            if (at + 9 > bytes.length) {
                return null;
            }
            const height = readUint16(bytes, at + 5);
            const width = readUint16(bytes, at + 7);
            return width > 0 && height > 0 ? { format: "jpeg", width, height } : null;
        }
        // The photo data starts at SOS; a frame header always comes before it.
        if (marker === 0xda || length < 2) {
            return null;
        }
        at += 2 + length;
    }
    return null;
}

/** WebP: the first chunk is VP8 (lossy), VP8L (lossless) or VP8X (extended), each with the size in its own layout. */
function inspectWebp(bytes: Uint8Array): PhotoInfo | null {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === "VP8 ") {
        // Frame tag (3 bytes), then the start code 9d 01 2a, then 14-bit width and height.
        if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
            return null;
        }
        return { format: "webp", width: readUint16LE(bytes, 26) & 0x3fff, height: readUint16LE(bytes, 28) & 0x3fff };
    }
    if (chunk === "VP8L") {
        if (bytes[20] !== 0x2f) {
            return null;
        }
        const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
        return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
        return { format: "webp", width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1 };
    }
    return null;
}
