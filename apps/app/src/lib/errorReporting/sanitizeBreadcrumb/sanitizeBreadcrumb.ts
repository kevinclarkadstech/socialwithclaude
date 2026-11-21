import type { Breadcrumb } from '@sentry/react';

/** A URL without its query string or fragment: tRPC queries put their input in the query. */
export function withoutQuery(url: string): string {
  return url.replace(/[?#].*$/, '');
}

/**
 * What a breadcrumb (the trail of what happened before an error) may say,
 * so a report never carries what someone typed or looked up: requests and
 * page changes keep their path but lose the query, and console messages are
 * dropped (the app's log lines can include what's on screen).
 */
export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') {
    return null;
  }
  const data = breadcrumb.data;
  if (!data) {
    return breadcrumb;
  }
  const cleaned = { ...data };
  for (const key of ['url', 'from', 'to']) {
    if (typeof cleaned[key] === 'string') {
      cleaned[key] = withoutQuery(cleaned[key]);
    }
  }
  return { ...breadcrumb, data: cleaned };
}
