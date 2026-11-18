import { describe, expect, it } from 'vitest';
import { currentTermsVersion } from '@myapp/shared/domains';
import { appName } from '../../../../common/brand';
import { legalDocumentHtml, legalDocumentTitle } from './legalDocumentHtml';

describe('legalDocumentHtml', () => {
  it('renders each document with the app name filled in', () => {
    for (const name of ['terms', 'privacy'] as const) {
      const html = legalDocumentHtml(name);
      expect(html).toContain('<h1>');
      expect(html).toContain(appName);
      expect(html).not.toContain('{{appName}}');
    }
  });

  it('prints the version people agree to (keep currentTermsVersion and the documents in step)', () => {
    for (const name of ['terms', 'privacy'] as const) {
      expect(legalDocumentHtml(name)).toContain(`Version ${currentTermsVersion} `);
    }
  });

  it('takes the title from the first heading', () => {
    expect(legalDocumentTitle('terms')).toBe('Terms of Service');
    expect(legalDocumentTitle('privacy')).toBe('Privacy Policy');
  });
});
