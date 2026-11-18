import { useState, type FormEvent } from 'react';
import { IonButton, IonInput, IonText } from '@ionic/react';
import { accountDeletionGraceDays } from '@myapp/shared/domains';
import { errorMessage } from '../../../../lib/api/errors';
import { longDate } from '../../../../utils/formatters/dates';
import { confirm, showNotice } from '../../../../lib/prompts';
import { forgetSession } from '../../actions/forgetSession/forgetSession';
import { runScheduleAccountDeletionMutation } from '../../operations/runScheduleAccountDeletionMutation/runScheduleAccountDeletionMutation';
import { runSendAccountDeletionCodeMutation } from '../../operations/runSendAccountDeletionCodeMutation/runSendAccountDeletionCodeMutation';
import '../../../../common/styles/modal-form.css';
import './DeleteAccountForm.css';

/**
 * What deleting your account does, then the steps: an emailed code, and a
 * last "are you sure". Once it's done, this device is signed out (the API
 * has signed out the others), `onDeleted` runs (e.g. to leave the page),
 * and they're told when it goes for good.
 */
export function DeleteAccountForm({ email, onDeleted }: { email: string; onDeleted?: () => void }) {
  const [step, setStep] = useState<'intro' | 'code'>('intro');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  function sendCode() {
    void run(async () => {
      const result = await runSendAccountDeletionCodeMutation();
      if (!result.ok) {
        setError(result.error.message ?? "Couldn't send a code. Try again.");
        return;
      }
      setCode('');
      setStep('code');
    });
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const confirmed = await confirm({
        header: 'Delete your account?',
        message: `Everything you've posted, your chats and your profile will be deleted for good after ${accountDeletionGraceDays} days.`,
        confirmText: 'Delete',
      });
      if (!confirmed) {
        return;
      }
      const result = await runScheduleAccountDeletionMutation({ code: code.trim() });
      if (!result.ok) {
        setError(result.error.message ?? "Couldn't delete your account. Try again.");
        return;
      }
      await forgetSession();
      onDeleted?.();
      await showNotice({
        header: 'Your account is being deleted',
        message: `It will be deleted for good on ${longDate(result.value.deletesAt)}. Until then, you can sign in again to restore it.`,
      });
    });
  }

  return (
    <div className="modal-form delete-account-form">
      <p>Deleting your account deletes everything you've made:</p>
      <ul>
        <li>your profile and photos</li>
        <li>your posts and listings, with their comments</li>
        <li>your comments, votes and saves</li>
        <li>your chats, for both of you</li>
        <li>who you follow and who follows you</li>
      </ul>
      <p>
        It's hidden from everyone straight away, and you're signed out everywhere. You have {accountDeletionGraceDays} days to change your
        mind: sign in again before then to restore it. After that, it's gone for good.
      </p>

      {step === 'intro' && (
        <IonButton expand="block" color="danger" disabled={isBusy} onClick={sendCode}>
          Email me a code to confirm
        </IonButton>
      )}

      {step === 'code' && (
        <form className="modal-form" onSubmit={submitCode}>
          <p>
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
          <IonInput
            label="Code"
            labelPlacement="stacked"
            fill="outline"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength={6}
            required
            value={code}
            onIonInput={(event) => setCode(event.detail.value ?? '')}
          />
          <IonButton type="submit" expand="block" color="danger" disabled={isBusy || code.trim().length !== 6}>
            Delete my account
          </IonButton>
          <IonButton fill="clear" size="small" disabled={isBusy} onClick={sendCode}>
            Send a new code
          </IonButton>
        </form>
      )}

      {error && (
        <IonText className="modal-form-error" color="danger" role="alert">
          <p>{error}</p>
        </IonText>
      )}
    </div>
  );
}
