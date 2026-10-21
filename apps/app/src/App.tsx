import { BrowserRouter, Navigate, Route, Routes, type RouteObject } from 'react-router';
import { IonApp, setupIonicReact } from '@ionic/react';
import { ellipse, square, triangle } from 'ionicons/icons';
import { TabNavigationProvider, TabsLayout, type TabDefinition } from './navigation';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import ItemDetail from './pages/ItemDetail';

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
import './theme/variables.css';

setupIonicReact();

const tabs: TabDefinition[] = [
  { id: 'tab1', path: '/tab1', label: 'Tab 1', icon: triangle, element: <Tab1 /> },
  { id: 'tab2', path: '/tab2', label: 'Tab 2', icon: ellipse, element: <Tab2 /> },
  { id: 'tab3', path: '/tab3', label: 'Tab 3', icon: square, element: <Tab3 /> },
];

/** Pages that can be pushed onto any tab, e.g. /tab1/items/3 or /tab2/items/3. */
const sharedRoutes: RouteObject[] = [{ path: 'items/:itemId', element: <ItemDetail /> }];

export function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <TabNavigationProvider tabs={tabs} sharedRoutes={sharedRoutes}>
          <Routes>
            <Route path="/" element={<Navigate to={tabs[0].path} replace />} />
            <Route path="*" element={<TabsLayout />} />
          </Routes>
        </TabNavigationProvider>
      </BrowserRouter>
    </IonApp>
  );
}
