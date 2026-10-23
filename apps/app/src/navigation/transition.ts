import {
  getConfig,
  getTimeGivenProgression,
  iosTransitionAnimation,
  mdTransitionAnimation,
  type Animation,
  type TransitionOptions,
} from '@ionic/react';
import { isNativePlatform } from './platform';

export type TransitionDirection = 'forward' | 'back';

export interface PageTransition {
  /** Resolves true when the animation ran to the end, false if it was cleaned up first. */
  finished: Promise<boolean>;
  /** Stops the animation (if running) and removes every style it added. */
  cleanUp: () => void;
}

/** Page transitions only run in the native app; in a browser pages switch instantly. */
export function animationsEnabled(): boolean {
  return isNativePlatform && (getConfig()?.getBoolean('animated', true) ?? true);
}

function currentMode(): 'ios' | 'md' {
  const mode = getConfig()?.get('mode') ?? document.documentElement.getAttribute('mode');
  return mode === 'ios' ? 'ios' : 'md';
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Waits until the Ionic components inside a page have rendered, so the iOS
 *  transition can find toolbars, titles and back buttons in their shadow roots. */
async function componentsReady(el: HTMLElement): Promise<void> {
  const ionicEls = Array.from(el.querySelectorAll<HTMLElement>('*')).filter((child) =>
    child.tagName.startsWith('ION-'),
  );
  await Promise.all(
    ionicEls.map((child) => (child as HTMLElement & { componentOnReady?: () => Promise<unknown> }).componentOnReady?.()),
  );
  await nextFrame();
}

interface PreparedTransition {
  mode: 'ios' | 'md';
  build: () => Animation;
  cleanUp: () => void;
}

/** Applies the styles Ionic's router sets around a page transition and returns
 *  a builder for the animation plus a cleanUp that undoes everything. */
function prepareTransition(
  baseEl: HTMLElement,
  enteringEl: HTMLElement,
  leavingEl: HTMLElement,
  direction: TransitionDirection,
): PreparedTransition {
  let animation: Animation | undefined;
  const mode = currentMode();

  enteringEl.style.zIndex = direction === 'back' ? '99' : '101';
  leavingEl.style.zIndex = '100';
  enteringEl.style.pointerEvents = 'none';
  leavingEl.style.pointerEvents = 'none';

  // Same as Ionic's router: stops a collapsible iOS header from flashing its
  // background during the transition.
  const header =
    mode === 'ios' ? (direction === 'back' ? leavingEl : enteringEl).querySelector('ion-header') : null;
  header?.classList.add('header-transitioning');

  return {
    mode,
    build: () => {
      const builder = mode === 'ios' ? iosTransitionAnimation : mdTransitionAnimation;
      const options = { baseEl, enteringEl, leavingEl, direction, mode, animated: true } as TransitionOptions;
      animation = builder(baseEl, options);
      return animation;
    },
    cleanUp: () => {
      animation?.destroy();
      header?.classList.remove('header-transitioning');
      for (const el of [enteringEl, leavingEl]) {
        el.classList.remove('ion-page-invisible');
        el.style.removeProperty('z-index');
        el.style.removeProperty('pointer-events');
        // Ionic's back animations hide the leaving page inline when they finish.
        el.style.removeProperty('display');
      }
    },
  };
}

/**
 * Plays Ionic's native page transition (iOS slide or MD fade-up) between two
 * `.ion-page` elements. Mirrors what IonRouterOutlet does internally.
 */
export function runPageTransition(
  baseEl: HTMLElement,
  enteringEl: HTMLElement,
  leavingEl: HTMLElement,
  direction: TransitionDirection,
): PageTransition {
  let cancelled = false;
  // Keep the entering page invisible until the animation takes over; the
  // builders remove this class when they start.
  enteringEl.classList.add('ion-page-invisible');
  const prepared = prepareTransition(baseEl, enteringEl, leavingEl, direction);

  const finished = (async () => {
    await componentsReady(enteringEl);
    if (cancelled) return false;
    await prepared.build().play();
    return !cancelled;
  })();

  return {
    finished,
    // Callers hide the leaving page before calling this, otherwise it would
    // flash back into place for a frame once the animation styles are removed.
    cleanUp: () => {
      cancelled = true;
      prepared.cleanUp();
    },
  };
}

export interface SwipeBackTransition {
  /** Moves the animation to `step` (0 = not swiped, 1 = fully back). */
  progress: (step: number) => void;
  /** Animates to the end (or back to the start) over `duration` ms. Resolves when done. */
  end: (shouldComplete: boolean, step: number, duration: number) => Promise<void>;
  cleanUp: () => void;
}

/**
 * Edge swipe to go back, in the native app only: browsers have their own
 * back gestures (e.g. iOS Safari's edge swipe), which this would fight.
 */
export function swipeBackEnabled(): boolean {
  if (!isNativePlatform) return false;
  return getConfig()?.getBoolean('swipeBackEnabled', currentMode() === 'ios') ?? currentMode() === 'ios';
}

/** A back transition driven by the user's finger, like IonRouterOutlet's swipe to go back. */
export function startSwipeBackTransition(
  baseEl: HTMLElement,
  enteringEl: HTMLElement,
  leavingEl: HTMLElement,
): SwipeBackTransition {
  const prepared = prepareTransition(baseEl, enteringEl, leavingEl, 'back');
  const animation = prepared.build();
  animation.progressStart(true, 0);

  return {
    progress: (step) => animation.progressStep(step),
    end: (shouldComplete, step, duration) =>
      new Promise((resolve) => {
        animation.onFinish(() => resolve(), { oneTimeCallback: true });
        // Same easing math as IonRouterOutlet: the linear swipe step is mapped
        // onto the transition's curve (reversed when snapping back).
        let newStep = shouldComplete ? -0.001 : 0.001;
        if (shouldComplete) {
          newStep += getTimeGivenProgression([0, 0], [0.32, 0.72], [0, 1], [1, 1], step)[0];
        } else {
          animation.easing('cubic-bezier(1, 0, 0.68, 0.28)');
          newStep += getTimeGivenProgression([0, 0], [1, 0], [0.68, 0.28], [1, 1], step)[0];
        }
        animation.progressEnd(shouldComplete ? 1 : 0, newStep, duration);
      }),
    cleanUp: prepared.cleanUp,
  };
}
