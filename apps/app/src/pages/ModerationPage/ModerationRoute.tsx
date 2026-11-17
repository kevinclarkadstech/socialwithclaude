import { IonSpinner } from '@ionic/react';
import { lazy, Suspense } from 'react';

// Admins only, so the page is loaded the first time it's opened rather than with the app.
const ModerationPage = lazy(() => import('./ModerationPage').then((module) => ({ default: module.ModerationPage })));

/** /moderation's route element: the page, loaded on demand. */
export function ModerationRoute() {
  return (
    <Suspense fallback={<IonSpinner className="page-message" />}>
      <ModerationPage />
    </Suspense>
  );
}
