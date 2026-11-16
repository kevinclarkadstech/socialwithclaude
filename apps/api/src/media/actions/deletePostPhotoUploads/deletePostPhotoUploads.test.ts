import { describe, expect, it, mock } from "bun:test";
import { deletePostPhotoUploads } from "./deletePostPhotoUploads";

const userId = "01JAAAAAAAAAAAAAAAAAAAAAA1";
const postId = "01JBBBBBBBBBBBBBBBBBBBBBB1";

describe("deletePostPhotoUploads", () => {
    it("deletes every size of each photo's upload", async () => {
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        await deletePostPhotoUploads({ storage: { deleteUploads }, userId, postId, photoIds: ["P1", "P2"] });
        expect(deleteUploads).toHaveBeenCalledWith({
            keys: ["P1", "P2"].flatMap((id) => [320, 640, 1280].map((size) => `${userId}/${postId}/${id}-${size}`)),
        });
    });

    it("does nothing without photos", async () => {
        const deleteUploads = mock(async (_args: { keys: string[] }) => {});
        await deletePostPhotoUploads({ storage: { deleteUploads }, userId, postId, photoIds: [] });
        expect(deleteUploads).not.toHaveBeenCalled();
    });
});
