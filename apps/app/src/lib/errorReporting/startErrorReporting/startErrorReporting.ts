import * as Sentry from '@sentry/capacitor';
import { init as initReact } from '@sentry/react';
import { sanitizeBreadcrumb, withoutQuery } from '../sanitizeBreadcrumb/sanitizeBreadcrumb';

/**
 * Reports the app's errors to Sentry: uncaught errors and rejected promises
 * in the web app, plus native crashes in the iOS and Android apps
 * (@sentry/capacitor starts Sentry's native SDKs too). Errors only: no
 * tracing or session replay. A report carries the error, its stack (readable
 * when the build uploaded source maps: see vite.config.ts), the device and
 * OS, the trail of what happened before it without queries or console
 * messages (sanitizeBreadcrumb), and the signed-in user's id, never their
 * email. Off unless VITE_SENTRY_DSN was set for the build.
 */
export function startErrorReporting({ dsn, environment, signedInUser }: {
  dsn: string | undefined;
  environment: string;
  /** Who's signed in (their user id, or null), and a way to hear when that changes. */
  signedInUser: { getId: () => string | null; subscribe: (listener: () => void) => unknown };
}): void {
  if (!dsn) {
    return;
  }
  Sentry.init(
    {
      dsn,
      environment,
      // The release comes from the build (vite.config.ts), when it uploads source maps.
      sendDefaultPii: false,
      beforeBreadcrumb: sanitizeBreadcrumb,
      beforeSend(event) {
        if (event.request?.url) {
          event.request.url = withoutQuery(event.request.url);
        }
        return event;
      },
    },
    initReact,
  );
  // Reports say whose app it was (an id only), so they can be grouped by who was affected.
  const setUser = () => {
    const userId = signedInUser.getId();
    Sentry.setUser(userId ? { id: userId } : null);
  };
  setUser();
  signedInUser.subscribe(setUser);
}
