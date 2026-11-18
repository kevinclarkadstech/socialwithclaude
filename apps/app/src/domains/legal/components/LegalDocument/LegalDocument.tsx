import { useMemo, type MouseEvent } from 'react';
import type { LegalDocumentName } from '../../types';
import { legalDocumentHtml } from '../../utils/legalDocumentHtml/legalDocumentHtml';
import './LegalDocument.css';

/**
 * A legal document, rendered. A link to another page of the app (e.g. from
 * the terms to /privacy) goes to `onOpenLink` instead of reloading the app;
 * links elsewhere open in a new tab.
 */
export function LegalDocument({ name, onOpenLink }: { name: LegalDocumentName; onOpenLink: (path: string) => void }) {
  const html = useMemo(() => legalDocumentHtml(name), [name]);

  function click(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href');
    if (!href) {
      return;
    }
    event.preventDefault();
    if (href.startsWith('/')) {
      onOpenLink(href);
    } else {
      window.open(href, '_blank', 'noopener');
    }
  }

  // Our own Markdown, shipped with the app (see legalDocumentHtml).
  return <div className="legal-document" onClick={click} dangerouslySetInnerHTML={{ __html: html }} />;
}
