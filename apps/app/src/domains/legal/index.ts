/**
 * The legal domain's public API: the only things code outside domains/legal imports.
 * Inside the domain, files import each other directly.
 */

// Components
export { LegalDocument } from './components/LegalDocument/LegalDocument';
export { TermsAgreement } from './components/TermsAgreement/TermsAgreement';
export { UpdatedTermsScreen } from './components/UpdatedTermsScreen/UpdatedTermsScreen';

// Utils
export { legalDocumentTitle } from './utils/legalDocumentHtml/legalDocumentHtml';

// Types
export type { LegalDocumentName } from './types';
