import type { AppLogger } from "@myapp/shared/observability";

/** Photo files built byte by byte, for media tests. */

export const bytes = (...parts: (number[] | string)[]) =>
    new Uint8Array(parts.flatMap((part) => (typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part)));
export const u16 = (n: number) => [n >> 8, n & 0xff];
export const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
export const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
export const segment = (marker: number, payload: number[] | string) => {
    const data = typeof payload === "string" ? [...payload].map((c) => c.charCodeAt(0)) : payload;
    return [0xff, marker, ...u16(data.length + 2), ...data];
};
export const text = (data: Uint8Array) => String.fromCharCode(...data);

/** A JPEG with JFIF, EXIF (with a "GPS" marker), an ICC profile, a comment, then the frame and scan. */
export function jpeg({ width, height }: { width: number; height: number }) {
    return bytes(
        [0xff, 0xd8],
        segment(0xe0, "JFIF\0\x01\x01\0\0\x01\0\x01\0\0"),
        segment(0xe1, "Exif\0\0GPS-LOCATION-DATA"),
        segment(0xe2, "ICC_PROFILE\0colours"),
        segment(0xfe, "a comment"),
        segment(0xc0, [8, ...u16(height), ...u16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
        segment(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]),
        [0x12, 0x34, 0xff, 0x00, 0x56],
        [0xff, 0xd9],
    );
}

/** An extended WebP (VP8X) with a photo chunk, then EXIF (odd size, so padded) and XMP chunks. */
export function webp({ width, height }: { width: number; height: number }) {
    const chunk = (id: string, data: number[]) => [...[...id].map((c) => c.charCodeAt(0)), ...u32le(data.length), ...data, ...(data.length % 2 ? [0] : [])];
    const body = [
        ...chunk("VP8X", [0x08 | 0x04 | 0x10, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]),
        ...chunk("VP8 ", [1, 2, 3, 0x9d, 0x01, 0x2a, 4, 5, 6]),
        ...chunk("EXIF", [...[..."GPS-LOCATION"].map((c) => c.charCodeAt(0)), 7]),
        ...chunk("XMP ", [...[..."<xmp/>"].map((c) => c.charCodeAt(0))]),
    ];
    return bytes("RIFF", u32le(body.length + 4), "WEBP", body);
}

/** A minimal JPEG of `width` × `height` with an EXIF segment holding "GPS" (for tests that inspect or strip photos). */
export function mockJpeg(width: number, height: number) {
    const exif = [..."Exif\0\0GPS"].map((c) => c.charCodeAt(0));
    return new Uint8Array([
        0xff, 0xd8,
        0xff, 0xe1, 0, exif.length + 2, ...exif,
        0xff, 0xc0, 0, 11, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0,
        0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0,
        0x12, 0x34, 0xff, 0xd9,
    ]);
}

/** A logger that drops everything, for tests. */
export const silentLogger: AppLogger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
    child() {
        return silentLogger;
    },
    setBindings() {},
};
