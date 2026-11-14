import { serverConfig } from "../config";
import { createRedisCache } from "./redis/createRedisCache/createRedisCache";
import type { Cache } from "./types";

export type { Cache } from "./types";

/** The API's cache (Redis). Everything else uses it through the Cache interface. */
export const cache: Cache = createRedisCache({ url: serverConfig.REDIS_URL });
