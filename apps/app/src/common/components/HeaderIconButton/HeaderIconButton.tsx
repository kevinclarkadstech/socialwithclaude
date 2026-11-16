import { IonButton, IonIcon } from '@ionic/react';
import { useNavigate } from 'react-router';

/** An icon button in a page's header that opens `to`, e.g. a tab's search. */
export function HeaderIconButton({ icon, label, to }: { icon: string; label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <IonButton onClick={() => navigate(to)}>
      <IonIcon slot="icon-only" icon={icon} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </IonButton>
  );
}
