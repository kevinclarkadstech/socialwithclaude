import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { IonApp, IonSplitPane, setupIonicReact } from '@ionic/react';
import { TabNavigationProvider, TabsLayout } from '../../navigation';
import { rootRoutes, sharedRoutes, tabs } from '../routes';
import { Sidebar } from '../Sidebar/Sidebar';
import { SignInGate } from '../SignInGate/SignInGate';
import { PhotoViewer } from '../../common/components/PhotoViewer/PhotoViewer';

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
import '../../theme/variables.css';
import '../../theme/overrides.css';
import './App.css';

// Material mode on every device, restyled in theme/overrides.css, so there's one look to design.
// No ripples: a pressed state is enough. Page transitions still follow the platform (see navigation/transition.ts).
setupIonicReact({ mode: 'md', rippleEffect: false });

export function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <SignInGate>
          <TabNavigationProvider tabs={tabs} sharedRoutes={sharedRoutes} rootRoutes={rootRoutes}>
            {/* A sidebar on wide screens ("lg" and up), the tab bar below that. */}
            <IonSplitPane when="lg" contentId="main" className="app-split-pane">
              <Sidebar contentId="main" />
              <div id="main" className="ion-page app-main">
                <Routes>
                  <Route path="/" element={<Navigate to={tabs[0].path} replace />} />
                  <Route path="*" element={<TabsLayout />} />
                </Routes>
              </div>
            </IonSplitPane>
          </TabNavigationProvider>
          <PhotoViewer />
        </SignInGate>
      </BrowserRouter>
    </IonApp>
  );
}
