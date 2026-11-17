import { IonSpinner } from '@ionic/react';
import { lazy, Suspense } from 'react';

// Admins only, so the page is loaded the first time it's opened rather than with the app.
const AdminPage = lazy(() => import('./AdminPage').then((module) => ({ default: module.AdminPage })));

/** /admin's route element: the page, loaded on demand. */
export function AdminRoute() {
  return (
    <Suspense fallback={<IonSpinner className="page-message" />}>
      <AdminPage />
    </Suspense>
  );
}
