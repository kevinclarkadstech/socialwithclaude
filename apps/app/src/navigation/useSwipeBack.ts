import { useEffect, type RefObject } from 'react';
import { createGesture, getIonPageElement, type GestureDetail } from '@ionic/react';
import { startSwipeBackTransition, swipeBackEnabled, type SwipeBackTransition } from './transition';

export interface SwipeBackOptions {
  /** Whether a swipe may start right now (active tab, has a page to go back to, not animating). */
  canStart: () => boolean;
  /** Stack wrappers for the page underneath (entering) and the top page (leaving). */
  getPages: () => { entering: HTMLElement; leaving: HTMLElement } | null;
  /** Called after a completed swipe; should pop the stack without animating again. */
  onSwipedBack: () => void;
}

const EDGE_THRESHOLD = 50;
const HIDDEN_CLASS = 'tab-stack-page-hidden';

const clamp = (min: number, value: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * iOS-style edge swipe to go back, matching IonRouterOutlet's gesture: start
 * within 50px of the edge, the pages follow the finger, and releasing past
 * halfway (or with a flick) completes the pop, otherwise it snaps back.
 */
export function useSwipeBack(paneRef: RefObject<HTMLElement | null>, optionsRef: RefObject<SwipeBackOptions>) {
  useEffect(() => {
    const el = paneRef.current;
    if (!el || !swipeBackEnabled()) return;

    let swipe: { transition: SwipeBackTransition; entering: HTMLElement; leaving: HTMLElement } | null = null;
    const isRtl = () => document.dir === 'rtl';
    const deltaX = (detail: GestureDetail) => (isRtl() ? -detail.deltaX : detail.deltaX);
    const velocityX = (detail: GestureDetail) => (isRtl() ? -detail.velocityX : detail.velocityX);

    const gesture = createGesture({
      el,
      gestureName: 'goback-swipe',
      // Above other horizontal gestures (e.g. sliding items use 100), same as Ionic.
      gesturePriority: 101,
      threshold: 10,
      canStart: (detail) => {
        const atEdge = isRtl()
          ? detail.startX >= window.innerWidth - EDGE_THRESHOLD
          : detail.startX <= EDGE_THRESHOLD;
        return atEdge && !swipe && optionsRef.current.canStart();
      },
      onStart: () => {
        const pages = optionsRef.current.getPages();
        if (!pages) return;
        // Reveal the page underneath; React still considers it hidden, which
        // stays true if the swipe is cancelled.
        pages.entering.classList.remove(HIDDEN_CLASS);
        swipe = {
          ...pages,
          transition: startSwipeBackTransition(
            el,
            getIonPageElement(pages.entering) as HTMLElement,
            getIonPageElement(pages.leaving) as HTMLElement,
          ),
        };
      },
      onMove: (detail) => {
        swipe?.transition.progress(clamp(0, deltaX(detail) / window.innerWidth, 0.9999));
      },
      onEnd: (detail) => {
        const current = swipe;
        if (!current) return;
        const width = window.innerWidth;
        const delta = deltaX(detail);
        const velocity = velocityX(detail);
        const step = delta / width;
        const shouldComplete = velocity >= 0 && (velocity > 0.2 || delta > width / 2);
        const missingDistance = (shouldComplete ? 1 - step : step) * width;
        const duration = missingDistance > 5 ? Math.min(missingDistance / Math.abs(velocity), 540) : 0;

        current.transition.end(shouldComplete, step <= 0 ? 0.01 : clamp(0, step, 0.9999), duration).then(() => {
          // Hide whichever page lost before removing the animation styles so it
          // can't flash back into place.
          (shouldComplete ? current.leaving : current.entering).classList.add(HIDDEN_CLASS);
          current.transition.cleanUp();
          swipe = null;
          if (shouldComplete) optionsRef.current.onSwipedBack();
        });
      },
    });
    gesture.enable(true);

    return () => {
      gesture.destroy();
      swipe?.transition.cleanUp();
    };
  }, [paneRef, optionsRef]);
}
