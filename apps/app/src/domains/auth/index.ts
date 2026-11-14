/**
 * The auth domain's public API: the only things code outside domains/auth imports.
 * Inside the domain, files import each other directly.
 */

// Components
export { SignInModal } from './components/SignInModal/SignInModal';

// Hooks
export { useAuth } from './hooks/useAuth/useAuth';
