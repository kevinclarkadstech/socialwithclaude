import { authClient } from '../../../../lib/auth/authClient';
import { sessionToken } from '../../../../lib/auth/sessionToken';
import { callingUserStore, refreshCallingUser } from '../../../users/callingUserStore';
import { postCommentStore } from '../../../posts/postCommentStore';
import { postStore } from '../../../posts/postStore';

const codeErrors: Record<string, string> = {
  INVALID_OTP: "That code isn't right. Check it and try again.",
  OTP_EXPIRED: 'That code has expired. Send a new one.',
  TOO_MANY_ATTEMPTS: 'Too many tries. Send a new code.',
};

/** Sessions: sign in with an emailed code, and sign out. */
export function useAuth() {
  /** Emails a 6-digit sign-in code (it's in the API log until email is set up). Returns a message on failure. */
  async function sendCode(email: string): Promise<string | null> {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    return error ? (error.message ?? "Couldn't send a code. Try again.") : null;
  }

  /** Signs in with the code; a new email gets an account. Returns a message on failure. */
  async function verifyCode(email: string, code: string): Promise<string | null> {
    const { error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      return (error.code && codeErrors[error.code]) ?? error.message ?? "Couldn't sign in. Try again.";
    }
    // What the viewer sees (saves, votes) depends on who's signed in.
    postStore.reset();
    postCommentStore.reset();
    await refreshCallingUser();
    return null;
  }

  async function signOut() {
    await authClient.signOut();
    await sessionToken.clear();
    callingUserStore.set(null);
    postStore.reset();
    postCommentStore.reset();
  }

  return { sendCode, verifyCode, signOut };
}
