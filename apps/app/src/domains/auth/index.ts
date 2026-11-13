/**
 * The auth domain's public API: the only things code outside domains/auth imports.
 * Inside the domain, files import each other directly.
 */

// Hooks
export { useAuth } from './hooks/useAuth/useAuth';
