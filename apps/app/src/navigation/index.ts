import { Capacitor } from '@capacitor/core';
import { StackTabNavigationProvider } from './StackTabNavigationProvider';
import { StackTabsLayout } from './StackTabsLayout';
import { WebTabNavigationProvider } from './WebTabNavigationProvider';
import { WebTabsLayout } from './WebTabsLayout';

/**
 * True in the iOS / Android app, false in a browser (including an installed
 * PWA). Fixed for the app's lifetime, so it's decided once here.
 */
export const isNativeNavigation = Capacitor.isNativePlatform();

/**
 * Natively, each tab keeps a back stack like a native app (transitions,
 * swipe-back, Android back button). In a browser the URL is the only state,
 * so the browser's back and forward buttons can't put the tabs out of sync.
 * Both provide the same contexts, so pages, BackButton and routerLink work
 * the same either way.
 */
export const TabNavigationProvider = isNativeNavigation ? StackTabNavigationProvider : WebTabNavigationProvider;
export const TabsLayout = isNativeNavigation ? StackTabsLayout : WebTabsLayout;

export { useTabNavigation } from './TabNavigationContext';
export { usePageContext, useTabHref } from './PageContext';
export { BackButton } from './BackButton';
export type { TabDefinition, StackEntry } from './stacks';
