import { marked } from 'marked';
import { appName, childSafetyEmail, contactEmail } from '../../../../common/brand';
import type { LegalDocumentName } from '../../types';
import terms from '../../documents/terms.md?raw';
import privacy from '../../documents/privacy.md?raw';
import childSafety from '../../documents/child-safety.md?raw';

const documents: Record<LegalDocumentName, string> = { terms, privacy, 'child-safety': childSafety };

/** What `{{name}}` in a document becomes. */
const fillIns: Record<string, string> = { appName, contactEmail, childSafetyEmail };

/**
 * A legal document as HTML, from its Markdown in documents/ with the app's
 * name and contact addresses filled in ({{appName}}, {{contactEmail}},
 * {{childSafetyEmail}}; an address becomes an email link). The Markdown is
 * ours (it ships with the app), so the HTML is safe to show as it is.
 */
export function legalDocumentHtml(name: LegalDocumentName): string {
  const filled = documents[name].replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => {
    const value = fillIns[key];
    if (value === undefined) {
      return placeholder;
    }
    return value.includes('@') ? `[${value}](mailto:${value})` : value;
  });
  return marked.parse(filled, { async: false });
}

/** The title of a legal document, from its first heading. */
export function legalDocumentTitle(name: LegalDocumentName): string {
  return /^# (.+)$/m.exec(documents[name])?.[1] ?? name;
}
