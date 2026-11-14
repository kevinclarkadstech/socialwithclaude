import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { IonApp, IonSplitPane, setupIonicReact } from '@ionic/react';
import { TabNavigationProvider, TabsLayout } from '../../navigation';
import { rootRoutes, sharedRoutes, tabs } from '../routes';
import { Sidebar } from '../Sidebar/Sidebar';
import { PhotoViewer } from '../../common/components/PhotoViewer/PhotoViewer';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { SignInModal } from '../../domains/auth';
import { callingUserStore, OnboardingModal, useCallingUser } from '../../domains/users';
import { showErrorToast } from '../../lib/toasts';

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

type OpenModal = 'none' | 'signIn' | 'onboarding';

/**
 * The app shell. It shows nothing until it knows who's signed in, so every
 * can* check runs with the real caller. Actions a check refuses arrive
 * through disallowedActions: signed out, the sign-in modal opens; signed in
 * without a profile, onboarding. Signing in to a new account goes on to
 * onboarding. Once the user has a profile, the action they were trying to do runs.
 */
export function App() {
  const { isLoaded } = useCallingUser();
  const [openModal, setOpenModal] = useState<OpenModal>('none');
  // What the user was trying to do when they were asked to sign in.
  const pendingAction = useRef<(() => void) | null>(null);
  // What to do once the sign-in modal has finished closing.
  const afterSignIn = useRef<'onboarding' | 'done' | null>(null);

  useEffect(
    () =>
      disallowedActions.subscribe(({ error, action }) => {
        const reason = error.metadata?.reason;
        if (reason === 'not-signed-in' || reason === 'profile-required') {
          pendingAction.current = action ?? null;
          setOpenModal(reason === 'not-signed-in' ? 'signIn' : 'onboarding');
          return;
        }
        void showErrorToast(error.message ?? "You can't do that");
      }),
    [],
  );

  function runPendingAction() {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }

  function signedIn() {
    afterSignIn.current = callingUserStore.get().callingUser?.profile ? 'done' : 'onboarding';
    setOpenModal('none');
  }

  // Opening onboarding only after sign-in has closed keeps the two modals from animating over each other.
  function signInDismissed() {
    const next = afterSignIn.current;
    afterSignIn.current = null;
    if (next === 'onboarding') {
      setOpenModal('onboarding');
      return;
    }
    if (next === 'done') {
      runPendingAction();
      return;
    }
    // Cancelled: the action doesn't run.
    pendingAction.current = null;
    setOpenModal('none');
  }

  function onboarded() {
    setOpenModal('none');
    runPendingAction();
  }

  function onboardingDismissed() {
    // "Later": the action needs a profile, so it doesn't run. (After onboarded, it has already run.)
    pendingAction.current = null;
    setOpenModal('none');
  }

  if (!isLoaded) {
    return <IonApp />;
  }

  return (
    <IonApp>
      <BrowserRouter>
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
        <SignInModal
          isOpen={openModal === 'signIn'}
          onSignedIn={signedIn}
          onCancel={() => setOpenModal('none')}
          onDidDismiss={signInDismissed}
        />
        <OnboardingModal
          isOpen={openModal === 'onboarding'}
          onDone={onboarded}
          onCancel={() => setOpenModal('none')}
          onDidDismiss={onboardingDismissed}
        />
      </BrowserRouter>
    </IonApp>
  );
}
