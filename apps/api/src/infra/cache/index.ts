import { serverConfig } from "../config";
import { createMemoryCache } from "./memory/createMemoryCache/createMemoryCache";
import { createRedisCache } from "./redis/createRedisCache/createRedisCache";
import type { Cache } from "./types";

export type { Cache } from "./types";

/** Whether the cache is shared by every instance (Redis), rather than each instance's own memory. */
export const cacheIsShared = serverConfig.REDIS_URL !== undefined;

/**
 * The API's cache: Redis when REDIS_URL is set, otherwise this instance's
 * memory. Everything else uses it through the Cache interface.
 */
export const cache: Cache = serverConfig.REDIS_URL ? createRedisCache({ url: serverConfig.REDIS_URL }) : createMemoryCache();
