import { useIonActionSheet, useIonAlert } from '@ionic/react';
import { reportReasons, type ReportReason } from '@myapp/shared/domains';
import { reportReasonLabels } from '../formatters/reportReasons';

/** Ionic prompts the menus share: confirming, asking for text, and choosing a report reason. */
export function usePrompts() {
  const [presentAlert] = useIonAlert();
  const [presentActionSheet] = useIonActionSheet();

  /** Asks before something that can't be undone. Resolves true if confirmed. */
  function confirm({ header, message, confirmText }: { header: string; message: string; confirmText: string }) {
    return new Promise<boolean>((resolve) => {
      void presentAlert({
        header,
        message,
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
          { text: confirmText, role: 'destructive', handler: () => resolve(true) },
        ],
        onDidDismiss: () => resolve(false),
      });
    });
  }

  /** Asks for a line or two of text. Resolves the trimmed text, or null if cancelled. */
  function askForText({ header, value = '', placeholder, confirmText }: {
    header: string;
    value?: string;
    placeholder?: string;
    confirmText: string;
  }) {
    return new Promise<string | null>((resolve) => {
      void presentAlert({
        header,
        inputs: [{ name: 'text', type: 'textarea', value, placeholder, attributes: { maxlength: 2000 } }],
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
          { text: confirmText, handler: (values: { text: string }) => resolve(values.text.trim() || null) },
        ],
        onDidDismiss: () => resolve(null),
      });
    });
  }

  /** "Report": a reason, plus details for "Something else". Resolves null if cancelled. */
  function askForReport() {
    return new Promise<{ reason: ReportReason; details: string | null } | null>((resolve) => {
      void presentActionSheet({
        header: 'Why are you reporting this?',
        buttons: [
          ...reportReasons.map((reason) => ({
            text: reportReasonLabels[reason],
            handler: () => {
              if (reason !== 'other') {
                resolve({ reason, details: null });
                return;
              }
              // "Something else" needs a few words.
              void askForText({ header: 'What’s wrong?', placeholder: 'Tell us more', confirmText: 'Report' }).then(
                (details) => resolve(details ? { reason, details } : null),
              );
            },
          })),
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
        ],
        onDidDismiss: ({ detail }) => {
          if (detail.role === 'cancel' || detail.role === 'backdrop') {
            resolve(null);
          }
        },
      });
    });
  }

  return { confirm, askForText, askForReport };
}
