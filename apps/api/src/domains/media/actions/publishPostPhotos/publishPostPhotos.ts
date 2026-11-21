import type { AppLogger } from "@myapp/shared/observability";
import type { Storage } from "../../../../infra/storage";
import { mapWithConcurrency, valuesOrThrow } from "@myapp/shared/utils";
import { publishPostPhoto } from "../publishPostPhoto/publishPostPhoto";

// Photos published at once: each is a few reads and writes, so this keeps a 10-photo post quick without a burst of connections.
const CONCURRENCY = 4;

/**
 * Publishes the photos the app uploaded for a post, as it's saved, a few at
 * a time (see publishPostPhoto). One that isn't usable is left out (the app
 * warns about it). Returns the published photos, in order, with their real
 * sizes. The uploads stay until the post is saved (deletePostPhotoUploads),
 * so a save that fails can be retried.
 */
export async function publishPostPhotos({ storage, logger, userId, postId, media }: {
    storage: Pick<Storage, "readUpload" | "putMedia">;
    logger: AppLogger;
    userId: string;
    postId: string;
    media: { id: string }[];
}): Promise<{ id: string; width: number; height: number }[]> {
    const settled = await mapWithConcurrency({
        items: media,
        limit: CONCURRENCY,
        run: ({ id }) => publishPostPhoto({ storage, logger, userId, postId, photoId: id }),
    });
    // A photo that isn't usable is null; one that threw (e.g. storage down) fails the save, which can be retried.
    const results = valuesOrThrow(settled);
    return results.filter((result): result is { id: string; width: number; height: number } => result !== null);
}
