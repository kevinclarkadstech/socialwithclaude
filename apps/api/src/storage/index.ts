import { serverConfig } from "../config";
import { createS3Storage } from "./s3/createS3Storage/createS3Storage";
import type { Storage } from "./types";

export type { Storage } from "./types";

/** The API's object storage (the S3 API: R2 in production, Garage locally). Everything else uses it through the Storage interface. */
export const storage: Storage = createS3Storage({
    endpoint: serverConfig.STORAGE_ENDPOINT,
    region: serverConfig.STORAGE_REGION,
    accessKeyId: serverConfig.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: serverConfig.STORAGE_SECRET_ACCESS_KEY,
    uploadsBucket: serverConfig.STORAGE_UPLOADS_BUCKET,
    mediaBucket: serverConfig.STORAGE_MEDIA_BUCKET,
});
