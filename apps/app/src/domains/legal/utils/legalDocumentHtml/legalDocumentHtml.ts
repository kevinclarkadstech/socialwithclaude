import { marked } from 'marked';
import { appName } from '../../../../common/brand';
import type { LegalDocumentName } from '../../types';
import terms from '../../documents/terms.md?raw';
import privacy from '../../documents/privacy.md?raw';

const documents: Record<LegalDocumentName, string> = { terms, privacy };

/**
 * A legal document as HTML, from its Markdown in documents/ with the app's
 * name filled in. The Markdown is ours (it ships with the app), so the HTML
 * is safe to show as it is.
 */
export function legalDocumentHtml(name: LegalDocumentName): string {
  return marked.parse(documents[name].replaceAll('{{appName}}', appName), { async: false });
}

/** The title of a legal document, from its first heading. */
export function legalDocumentTitle(name: LegalDocumentName): string {
  return /^# (.+)$/m.exec(documents[name])?.[1] ?? name;
}
