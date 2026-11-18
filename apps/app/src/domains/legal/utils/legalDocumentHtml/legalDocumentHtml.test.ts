import { describe, expect, it } from 'vitest';
import { currentTermsVersion } from '@myapp/shared/domains';
import { appName, childSafetyEmail, contactEmail } from '../../../../common/brand';
import { legalDocumentHtml, legalDocumentTitle } from './legalDocumentHtml';

describe('legalDocumentHtml', () => {
  it('renders each document with the app name and contact addresses filled in', () => {
    for (const name of ['terms', 'privacy', 'child-safety'] as const) {
      const html = legalDocumentHtml(name);
      expect(html).toContain('<h1>');
      expect(html).toContain(appName);
      expect(html).not.toContain('{{');
    }
    expect(legalDocumentHtml('terms')).toContain(`<a href="mailto:${contactEmail}">${contactEmail}</a>`);
    expect(legalDocumentHtml('child-safety')).toContain(`mailto:${childSafetyEmail}`);
  });

  it('prints the version people agree to (keep currentTermsVersion and the documents in step)', () => {
    for (const name of ['terms', 'privacy'] as const) {
      expect(legalDocumentHtml(name)).toContain(`Version ${currentTermsVersion} `);
    }
  });

  it('takes the title from the first heading', () => {
    expect(legalDocumentTitle('terms')).toBe('Terms of Service');
    expect(legalDocumentTitle('privacy')).toBe('Privacy Policy');
    expect(legalDocumentTitle('child-safety')).toBe('Child Safety Standards');
  });
});
