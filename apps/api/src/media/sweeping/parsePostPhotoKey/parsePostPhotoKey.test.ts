import { describe, expect, it } from "bun:test";
import { parsePostPhotoKey } from "./parsePostPhotoKey";

const U = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const P = "01JBBBBBBBBBBBBBBBBBBBBBB1";
const M = "01JMMMMMMMMMMMMMMMMMMMMMM1";

describe("parsePostPhotoKey", () => {
    it("reads a post photo's key", () => {
        expect(parsePostPhotoKey(`${U}/${P}/${M}-640`)).toEqual({ userId: U, postId: P, photoId: M, size: 640 });
    });

    it("ignores profile photos, unknown sizes and anything else", () => {
        expect(parsePostPhotoKey(`users/${U}/avatar-96`)).toBeNull();
        expect(parsePostPhotoKey(`${U}/${P}/${M}-500`)).toBeNull();
        expect(parsePostPhotoKey(`${U}/${P}/${M}-640.bak`)).toBeNull();
        expect(parsePostPhotoKey("readme.txt")).toBeNull();
    });
});
