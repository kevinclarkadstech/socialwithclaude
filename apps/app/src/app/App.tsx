import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { IonApp, setupIonicReact } from '@ionic/react';
import { SignInProvider } from '../features/auth/SignInProvider';
import { TabNavigationProvider, TabsLayout } from '../navigation';
import { rootRoutes, tabs } from './routes';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import '../theme/variables.css';

setupIonicReact();

export function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <SignInProvider>
          <TabNavigationProvider tabs={tabs} rootRoutes={rootRoutes}>
            <Routes>
              <Route path="/" element={<Navigate to={tabs[0].path} replace />} />
              <Route path="*" element={<TabsLayout />} />
            </Routes>
          </TabNavigationProvider>
        </SignInProvider>
      </BrowserRouter>
    </IonApp>
  );
}
