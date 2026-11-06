import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCallingUser } from '../hooks/useCallingUser';
import { SignInContext } from './SignInContext';
import { SignInModal } from './SignInModal';

/** Provides requireSignIn, and the sign-in modal it opens. */
export function SignInProvider({ children }: { children: ReactNode }) {
  const { callingUser } = useCallingUser();
  const [isOpen, setIsOpen] = useState(false);
  // What the user was doing when they were asked to sign in.
  const pendingAction = useRef<(() => void) | null>(null);

  const requireSignIn = useCallback(
    (action?: () => void) => {
      if (callingUser?.profile) {
        action?.();
        return;
      }
      pendingAction.current = action ?? null;
      setIsOpen(true);
    },
    [callingUser],
  );

  const finish = useCallback(() => {
    setIsOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  const cancel = useCallback(() => {
    pendingAction.current = null;
    setIsOpen(false);
  }, []);

  const value = useMemo(() => ({ requireSignIn }), [requireSignIn]);

  return (
    <SignInContext.Provider value={value}>
      {children}
      <SignInModal isOpen={isOpen} onDone={finish} onCancel={cancel} />
    </SignInContext.Provider>
  );
}
