import { Capacitor } from '@capacitor/core';

/**
 * True in the iOS / Android app, false in a browser (including an installed
 * PWA). Fixed for the app's lifetime.
 */
export const isNativePlatform = Capacitor.isNativePlatform();
