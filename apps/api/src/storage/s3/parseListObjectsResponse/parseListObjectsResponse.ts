/** One object in a listing. */
export interface ListedObject {
    key: string;
    lastModified: Date;
}

const unescapeXml = (text: string) =>
    text.replace(/&(lt|gt|quot|apos|amp);/g, (_, name: string) => ({ lt: "<", gt: ">", quot: "\"", apos: "'", amp: "&" })[name]!);

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];

/**
 * The objects in an S3 ListObjectsV2 reply, and the token for the next page
 * (null on the last). Only the fields the API uses are read, so a few tags
 * are picked out rather than pulling in an XML parser.
 */
export function parseListObjectsResponse(xml: string): { objects: ListedObject[]; nextCursor: string | null } {
    const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].flatMap(([, contents]): ListedObject[] => {
        const key = tag(contents!, "Key");
        const lastModified = tag(contents!, "LastModified");
        if (key === undefined || lastModified === undefined) {
            return [];
        }
        return [{ key: unescapeXml(key), lastModified: new Date(lastModified) }];
    });
    const isTruncated = tag(xml, "IsTruncated") === "true";
    const token = tag(xml, "NextContinuationToken");
    return { objects, nextCursor: isTruncated && token ? unescapeXml(token) : null };
}
