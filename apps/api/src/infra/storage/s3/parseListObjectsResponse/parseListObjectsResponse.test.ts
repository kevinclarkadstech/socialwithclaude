import { describe, expect, it } from "bun:test";
import { parseListObjectsResponse } from "./parseListObjectsResponse";

describe("parseListObjectsResponse", () => {
    it("reads each object's key and last-modified time, and the next page's token", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>media</Name><KeyCount>2</KeyCount><MaxKeys>2</MaxKeys><IsTruncated>true</IsTruncated>
  <Contents><Key>U1/P1/M1-320</Key><LastModified>2026-11-01T10:00:00.000Z</LastModified><Size>1234</Size></Contents>
  <Contents><Key>users/U1/avatar-96 &amp; more</Key><LastModified>2026-11-02T10:00:00.000Z</LastModified><Size>99</Size></Contents>
  <NextContinuationToken>abc&amp;def</NextContinuationToken>
</ListBucketResult>`;
        expect(parseListObjectsResponse(xml)).toEqual({
            objects: [
                { key: "U1/P1/M1-320", lastModified: new Date("2026-11-01T10:00:00.000Z") },
                { key: "users/U1/avatar-96 & more", lastModified: new Date("2026-11-02T10:00:00.000Z") },
            ],
            nextCursor: "abc&def",
        });
    });

    it("has no next page on the last one, and handles an empty bucket", () => {
        const xml = "<ListBucketResult><KeyCount>0</KeyCount><IsTruncated>false</IsTruncated></ListBucketResult>";
        expect(parseListObjectsResponse(xml)).toEqual({ objects: [], nextCursor: null });
    });
});
