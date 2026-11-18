import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { App as CapacitorApp } from '@capacitor/app';
import { config } from '../../lib/config';
import { isNativePlatform } from '../../utils';
import { deepLinkPath } from '../deepLinkPath/deepLinkPath';

// The link the app was opened with is handled once per launch, even if the router is shown again.
let launchLinkChecked = false;
// When it was handled, and which it was: the same link can also arrive as an event just after.
let launchLink: { url: string; at: number } | null = null;

/**
 * Opens links to the app's web address in the app (native app only; renders
 * nothing): a Universal Link on iOS or a verified App Link on Android, tapped
 * anywhere while the app is installed, opens the screen it's about here
 * instead of in the browser. Rendered once, inside the router.
 */
export function DeepLinksBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform) {
      return;
    }
    const open = (url: string) => {
      const path = deepLinkPath({ url, publicUrl: config.publicUrl });
      if (path) {
        void navigate(path);
      }
    };

    if (!launchLinkChecked) {
      launchLinkChecked = true;
      void CapacitorApp.getLaunchUrl().then((launch) => {
        if (launch?.url) {
          launchLink = { url: launch.url, at: Date.now() };
          open(launch.url);
        }
      });
    }

    const handle = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const isLaunchLinkAgain = launchLink?.url === url && Date.now() - launchLink.at < 3000;
      launchLink = null;
      if (!isLaunchLinkAgain) {
        open(url);
      }
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [navigate]);

  return null;
}
