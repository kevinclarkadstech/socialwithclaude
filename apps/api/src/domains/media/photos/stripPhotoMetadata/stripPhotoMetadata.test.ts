import { describe, expect, it } from "bun:test";
import { bytes, jpeg, text, u32le, webp } from "../../testing";
import { inspectPhoto } from "../inspectPhoto/inspectPhoto";
import { stripPhotoMetadata } from "./stripPhotoMetadata";

describe("stripPhotoMetadata", () => {
    it("drops a JPEG's EXIF and comment, and keeps the JFIF, colour profile and photo data", () => {
        const original = jpeg({ width: 96, height: 96 });
        const stripped = stripPhotoMetadata(original, "jpeg");
        expect(text(stripped)).not.toContain("GPS-LOCATION");
        expect(text(stripped)).not.toContain("a comment");
        expect(text(stripped)).toContain("JFIF");
        expect(text(stripped)).toContain("ICC_PROFILE");
        expect(text(stripped).endsWith(text(original.subarray(original.length - 7)))).toBe(true);
        expect(inspectPhoto(stripped)).toEqual({ format: "jpeg", width: 96, height: 96 });
    });

    it("drops a WebP's EXIF and XMP chunks, clears their flags and fixes the RIFF size", () => {
        const stripped = stripPhotoMetadata(webp({ width: 800, height: 267 }), "webp");
        expect(text(stripped)).not.toContain("GPS-LOCATION");
        expect(text(stripped)).not.toContain("<xmp/>");
        expect(stripped[20]! & 0x0c).toBe(0);
        expect(stripped[20]! & 0x10).toBe(0x10);
        expect(new DataView(stripped.buffer).getUint32(4, true)).toBe(stripped.length - 8);
        expect(inspectPhoto(stripped)).toEqual({ format: "webp", width: 800, height: 267 });
    });

    it("leaves a simple WebP (which can't carry metadata) as it is", () => {
        const simple = bytes("RIFF", u32le(30), "WEBP", "VP8 ", u32le(18), [0, 0, 0, 0x9d, 0x01, 0x2a, 96, 0, 96, 0], new Array(10).fill(0));
        expect(stripPhotoMetadata(simple, "webp")).toBe(simple);
    });
});
