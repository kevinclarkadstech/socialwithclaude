import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { SignInContext } from '../common/hooks/useRequireSignIn';
import { callingUserStore } from '../domains/users/callingUserStore';
import { useCallingUser } from '../domains/users/hooks/useCallingUser';
import { SignInModal } from '../domains/auth/components/SignInModal';
import { OnboardingModal } from '../domains/users/components/OnboardingModal';

type OpenModal = 'none' | 'signIn' | 'onboarding';

/**
 * Provides requireSignIn: signed out, it opens the sign-in modal; signed in
 * without a profile, the onboarding modal. Signing in to a new account closes
 * the sign-in modal and then opens onboarding. Once the user has a profile,
 * the action they were trying to do runs.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const { callingUser } = useCallingUser();
  const [openModal, setOpenModal] = useState<OpenModal>('none');
  // What the user was doing when they were asked to sign in.
  const pendingAction = useRef<(() => void) | null>(null);
  // What to do once the sign-in modal has finished closing.
  const afterSignIn = useRef<'onboarding' | 'done' | null>(null);

  const runPendingAction = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  const requireSignIn = useCallback(
    (action?: () => void) => {
      if (callingUser?.profile) {
        action?.();
        return;
      }
      pendingAction.current = action ?? null;
      setOpenModal(callingUser ? 'onboarding' : 'signIn');
    },
    [callingUser],
  );

  const signedIn = useCallback(() => {
    afterSignIn.current = callingUserStore.get().callingUser?.profile ? 'done' : 'onboarding';
    setOpenModal('none');
  }, []);

  // Opening onboarding only after sign-in has closed keeps the two modals from animating over each other.
  const signInDismissed = useCallback(() => {
    const next = afterSignIn.current;
    afterSignIn.current = null;
    if (next === 'onboarding') {
      setOpenModal('onboarding');
    } else if (next === 'done') {
      runPendingAction();
    } else {
      pendingAction.current = null;
      setOpenModal('none');
    }
  }, [runPendingAction]);

  const onboarded = useCallback(() => {
    setOpenModal('none');
    runPendingAction();
  }, [runPendingAction]);

  const onboardingDismissed = useCallback(() => {
    // "Later": the action needs a profile, so it doesn't run.
    pendingAction.current = null;
    setOpenModal('none');
  }, []);

  const close = useCallback(() => setOpenModal('none'), []);
  const value = useMemo(() => ({ requireSignIn }), [requireSignIn]);

  return (
    <SignInContext.Provider value={value}>
      {children}
      <SignInModal
        isOpen={openModal === 'signIn'}
        onSignedIn={signedIn}
        onCancel={close}
        onDidDismiss={signInDismissed}
      />
      <OnboardingModal
        isOpen={openModal === 'onboarding'}
        onDone={onboarded}
        onCancel={close}
        onDidDismiss={onboardingDismissed}
      />
    </SignInContext.Provider>
  );
}
