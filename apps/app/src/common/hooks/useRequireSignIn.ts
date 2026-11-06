import { createContext, useContext } from 'react';

export interface SignInContextValue {
  /**
   * Runs `action` if the user is signed in and has finished sign-up.
   * Otherwise opens the sign-in modal and runs `action` once they're done.
   * With no action, just opens the modal when needed.
   */
  requireSignIn: (action?: () => void) => void;
}

/** Provided by app/SignInGate. */
export const SignInContext = createContext<SignInContextValue | null>(null);

export function useRequireSignIn(): SignInContextValue['requireSignIn'] {
  const context = useContext(SignInContext);
  if (!context) {
    throw new Error('useRequireSignIn must be used inside SignInGate');
  }
  return context.requireSignIn;
}
