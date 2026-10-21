import { IonBackButton } from '@ionic/react';
import type { ComponentProps } from 'react';
import { useTabNavigation } from './TabNavigationContext';
import { usePageContext } from './PageContext';

type Props = Omit<ComponentProps<typeof IonBackButton>, 'defaultHref' | 'ref'>;

/** IonBackButton that pops the tab stack. Renders nothing on a tab's root page. */
export function BackButton({ className, ...props }: Props) {
  const { canGoBack } = usePageContext();
  const { goBack } = useTabNavigation();
  if (!canGoBack) return null;

  // Without IonReactRouter, IonBackButton neither navigates nor shows itself
  // (no defaultHref), so CSS makes it visible and the wrapper handles the tap.
  return (
    <span className="tab-back-button-wrapper" onClick={goBack}>
      <IonBackButton {...props} className={['tab-back-button', className].filter(Boolean).join(' ')} />
    </span>
  );
}
