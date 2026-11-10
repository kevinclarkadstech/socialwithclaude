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
