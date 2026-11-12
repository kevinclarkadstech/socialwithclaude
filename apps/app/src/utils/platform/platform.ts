import { Capacitor } from '@capacitor/core';

/**
 * True in the iOS / Android app, false in a browser (including an installed
 * PWA). Fixed for the app's lifetime.
 */
export const isNativePlatform = Capacitor.isNativePlatform();

/**
 * True on an iPhone or iPad (the native app only). The app's look is the same
 * everywhere (Material mode, restyled), but page transitions and swipe-back
 * follow the platform: iOS slides, Android fades up.
 */
export const isIOS = Capacitor.getPlatform() === 'ios';
