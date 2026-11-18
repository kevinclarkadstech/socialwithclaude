import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The native apps (iOS and Android) around the web build in dist/.
 *
 * appId is a PLACEHOLDER: set the real one (reverse domain, e.g.
 * com.yourcompany.appname) before the first upload to either store. It
 * can't change after that. Change it here, then in ios/App (the Xcode
 * project's bundle identifier) and android/app/build.gradle (applicationId),
 * and set APPLE_APP_BUNDLE_IDENTIFIER on the API to match.
 *
 * The app loads from capacitor://localhost on iOS and https://localhost on
 * Android; the API allows both (nativeAppOrigins). Build the web app with
 * VITE_API_URL, VITE_PUBLIC_URL and VITE_MEDIA_URL set to the real
 * addresses first: in a native app there's no localhost API to fall back on.
 */
const config: CapacitorConfig = {
  appId: 'com.example.placeholder',
  appName: 'Placeholder',
  webDir: 'dist',
};

export default config;
