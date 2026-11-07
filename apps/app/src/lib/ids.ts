import { monotonicFactory } from 'ulid';

/**
 * A new id for something the app creates (a post, a comment). The client
 * makes it, so a retried create can't make a second copy: the API returns
 * the first one.
 */
export const newId = monotonicFactory();
