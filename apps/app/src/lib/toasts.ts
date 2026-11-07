import { toastController } from '@ionic/core/components';
import { defineCustomElement } from '@ionic/core/components/ion-toast.js';

// The React wrapper registers <ion-toast> only when IonToast is rendered; toastController needs it registered.
defineCustomElement();

/** Shows an error toast. For failures a screen doesn't handle itself. */
export async function showErrorToast(message: string) {
  const toast = await toastController.create({ message, duration: 4000, color: 'danger', position: 'top' });
  await toast.present();
}

/** Shows a short confirmation, e.g. "Report sent". */
export async function showToast(message: string) {
  const toast = await toastController.create({ message, duration: 2500, position: 'top' });
  await toast.present();
}
