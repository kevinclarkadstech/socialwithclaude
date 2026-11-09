import { actionSheetController, alertController, type ActionSheetButton } from '@ionic/core/components';
import { defineCustomElement as defineActionSheet } from '@ionic/core/components/ion-action-sheet.js';
import { defineCustomElement as defineAlert } from '@ionic/core/components/ion-alert.js';

// As with toasts: the controllers need the elements registered, which the React wrappers only do when rendered.
defineAlert();
defineActionSheet();

/** Asks before something that can't be undone. Resolves true if confirmed. */
export async function confirm({ header, message, confirmText }: { header: string; message: string; confirmText: string }) {
  const alert = await alertController.create({
    header,
    message,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: confirmText, role: 'confirm', cssClass: 'alert-button-destructive' },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'confirm';
}

/** Asks for a line or two of text. Resolves the trimmed text, or null if cancelled or left empty. */
export async function askForText({ header, value = '', placeholder, confirmText }: {
  header: string;
  value?: string;
  placeholder?: string;
  confirmText: string;
}) {
  const alert = await alertController.create({
    header,
    inputs: [{ name: 'text', type: 'textarea', value, placeholder, attributes: { maxlength: 2000 } }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: confirmText, role: 'confirm' },
    ],
  });
  await alert.present();
  const { role, data } = await alert.onDidDismiss<{ values: { text: string } }>();
  if (role !== 'confirm') {
    return null;
  }
  const text = data?.values.text.trim() ?? '';
  return text || null;
}

/**
 * A menu of choices. Resolves the `value` of the one picked, or null if
 * cancelled. A Cancel button is added at the end.
 */
export async function chooseFrom<Value extends string>({ header, options }: {
  header?: string;
  options: { text: string; value: Value; role?: 'destructive' }[];
}) {
  const buttons: ActionSheetButton[] = [
    ...options.map(({ text, value, role }) => ({ text, role, data: { value } })),
    { text: 'Cancel', role: 'cancel' },
  ];
  const actionSheet = await actionSheetController.create({ header, buttons });
  await actionSheet.present();
  const { data } = await actionSheet.onDidDismiss<{ value: Value }>();
  return data?.value ?? null;
}

/**
 * A menu whose options act inside the tap itself (rather than after the menu
 * closes, as chooseFrom does). Needed for anything a browser only allows from
 * a direct tap, like opening the file picker.
 */
export async function showMenu({ header, options }: {
  header?: string;
  options: { text: string; role?: 'destructive'; onSelect: () => void }[];
}) {
  const actionSheet = await actionSheetController.create({
    header,
    buttons: [
      ...options.map(({ text, role, onSelect }) => ({ text, role, handler: onSelect })),
      { text: 'Cancel', role: 'cancel' },
    ],
  });
  await actionSheet.present();
}
