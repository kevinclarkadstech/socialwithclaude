import { describe, expect, it } from "bun:test";
import { inspectImage } from "./inspectImage";
import { stripImageMetadata } from "./stripImageMetadata";

const bytes = (...parts: (number[] | string)[]) =>
    new Uint8Array(parts.flatMap((part) => (typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part)));
const u16 = (n: number) => [n >> 8, n & 0xff];
const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
const segment = (marker: number, payload: number[] | string) => {
    const data = typeof payload === "string" ? [...payload].map((c) => c.charCodeAt(0)) : payload;
    return [0xff, marker, ...u16(data.length + 2), ...data];
};
const text = (data: Uint8Array) => String.fromCharCode(...data);

/** A JPEG with JFIF, EXIF (with a "GPS" marker), an ICC profile, a comment, then the frame and scan. */
function jpeg({ width, height }: { width: number; height: number }) {
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

/** An extended WebP (VP8X) with an image chunk, then EXIF (odd size, so padded) and XMP chunks. */
function webp({ width, height }: { width: number; height: number }) {
    const chunk = (id: string, data: number[]) => [...[...id].map((c) => c.charCodeAt(0)), ...u32le(data.length), ...data, ...(data.length % 2 ? [0] : [])];
    const body = [
        ...chunk("VP8X", [0x08 | 0x04 | 0x10, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]),
        ...chunk("VP8 ", [1, 2, 3, 0x9d, 0x01, 0x2a, 4, 5, 6]),
        ...chunk("EXIF", [...[..."GPS-LOCATION"].map((c) => c.charCodeAt(0)), 7]),
        ...chunk("XMP ", [...[..."<xmp/>"].map((c) => c.charCodeAt(0))]),
    ];
    return bytes("RIFF", u32le(body.length + 4), "WEBP", body);
}

describe("inspectImage", () => {
    it("reads a JPEG's size from its frame header", () => {
        expect(inspectImage(jpeg({ width: 400, height: 400 }))).toEqual({ format: "jpeg", width: 400, height: 400 });
    });

    it("reads an extended WebP's size", () => {
        expect(inspectImage(webp({ width: 1600, height: 533 }))).toEqual({ format: "webp", width: 1600, height: 533 });
    });

    it("reads lossy (VP8) and lossless (VP8L) WebP sizes", () => {
        const vp8 = bytes("RIFF", u32le(30), "WEBP", "VP8 ", u32le(18), [0, 0, 0, 0x9d, 0x01, 0x2a], [...u16(96).reverse()], [...u16(96).reverse()], new Array(10).fill(0));
        expect(inspectImage(vp8)).toEqual({ format: "webp", width: 96, height: 96 });
        const bits = (800 - 1) | ((267 - 1) << 14);
        const vp8l = bytes("RIFF", u32le(30), "WEBP", "VP8L", u32le(10), [0x2f], u32le(bits), new Array(10).fill(0));
        expect(inspectImage(vp8l)).toEqual({ format: "webp", width: 800, height: 267 });
    });

    it("refuses anything else", () => {
        expect(inspectImage(bytes("<html><script>alert(1)</script></html>"))).toBeNull();
        expect(inspectImage(bytes([0x89], "PNG\r\n\x1a\n", new Array(30).fill(0)))).toBeNull();
        expect(inspectImage(bytes([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0]))).toBeNull();
        expect(inspectImage(new Uint8Array())).toBeNull();
    });
});

describe("stripImageMetadata", () => {
    it("drops a JPEG's EXIF and comment, and keeps the JFIF, colour profile and image data", () => {
        const original = jpeg({ width: 96, height: 96 });
        const stripped = stripImageMetadata(original, "jpeg");
        expect(text(stripped)).not.toContain("GPS-LOCATION");
        expect(text(stripped)).not.toContain("a comment");
        expect(text(stripped)).toContain("JFIF");
        expect(text(stripped)).toContain("ICC_PROFILE");
        expect(text(stripped).endsWith(text(original.subarray(original.length - 7)))).toBe(true);
        expect(inspectImage(stripped)).toEqual({ format: "jpeg", width: 96, height: 96 });
    });

    it("drops a WebP's EXIF and XMP chunks, clears their flags and fixes the RIFF size", () => {
        const stripped = stripImageMetadata(webp({ width: 800, height: 267 }), "webp");
        expect(text(stripped)).not.toContain("GPS-LOCATION");
        expect(text(stripped)).not.toContain("<xmp/>");
        expect(stripped[20]! & 0x0c).toBe(0);
        expect(stripped[20]! & 0x10).toBe(0x10);
        expect(new DataView(stripped.buffer).getUint32(4, true)).toBe(stripped.length - 8);
        expect(inspectImage(stripped)).toEqual({ format: "webp", width: 800, height: 267 });
    });

    it("leaves a simple WebP (which can't carry metadata) as it is", () => {
        const simple = bytes("RIFF", u32le(30), "WEBP", "VP8 ", u32le(18), [0, 0, 0, 0x9d, 0x01, 0x2a, 96, 0, 96, 0], new Array(10).fill(0));
        expect(stripImageMetadata(simple, "webp")).toBe(simple);
    });
});
