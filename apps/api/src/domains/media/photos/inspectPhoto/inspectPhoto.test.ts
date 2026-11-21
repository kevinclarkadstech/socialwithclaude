import { describe, expect, it } from "bun:test";
import { bytes, jpeg, u16, u32le, webp } from "../../testing";
import { inspectPhoto } from "./inspectPhoto";

describe("inspectPhoto", () => {
    it("reads a JPEG's size from its frame header", () => {
        expect(inspectPhoto(jpeg({ width: 400, height: 400 }))).toEqual({ format: "jpeg", width: 400, height: 400 });
    });

    it("reads an extended WebP's size", () => {
        expect(inspectPhoto(webp({ width: 1600, height: 533 }))).toEqual({ format: "webp", width: 1600, height: 533 });
    });

    it("reads lossy (VP8) and lossless (VP8L) WebP sizes", () => {
        const vp8 = bytes("RIFF", u32le(30), "WEBP", "VP8 ", u32le(18), [0, 0, 0, 0x9d, 0x01, 0x2a], [...u16(96).reverse()], [...u16(96).reverse()], new Array(10).fill(0));
        expect(inspectPhoto(vp8)).toEqual({ format: "webp", width: 96, height: 96 });
        const bits = (800 - 1) | ((267 - 1) << 14);
        const vp8l = bytes("RIFF", u32le(30), "WEBP", "VP8L", u32le(10), [0x2f], u32le(bits), new Array(10).fill(0));
        expect(inspectPhoto(vp8l)).toEqual({ format: "webp", width: 800, height: 267 });
    });

    it("refuses anything else", () => {
        expect(inspectPhoto(bytes("<html><script>alert(1)</script></html>"))).toBeNull();
        expect(inspectPhoto(bytes([0x89], "PNG\r\n\x1a\n", new Array(30).fill(0)))).toBeNull();
        expect(inspectPhoto(bytes([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0]))).toBeNull();
        expect(inspectPhoto(new Uint8Array())).toBeNull();
    });
});
