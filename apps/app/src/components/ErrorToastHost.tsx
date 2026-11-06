import { useIonToast } from '@ionic/react';
import { useEffect } from 'react';
import { onErrorToast } from '../api/errorToasts';

/** Shows the toasts from showErrorToast. Rendered once, near the root. */
export function ErrorToastHost() {
  const [present] = useIonToast();

  useEffect(
    () =>
      onErrorToast((message) => {
        void present({ message, duration: 4000, color: 'danger', position: 'top' });
      }),
    [present],
  );

  return null;
}
