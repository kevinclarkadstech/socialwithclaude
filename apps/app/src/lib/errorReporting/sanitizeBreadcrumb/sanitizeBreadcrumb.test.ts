import { describe, expect, it } from 'vitest';
import { sanitizeBreadcrumb } from './sanitizeBreadcrumb';

describe('sanitizeBreadcrumb', () => {
  it('keeps the path of requests and page changes, not their query', () => {
    expect(sanitizeBreadcrumb({ category: 'fetch', data: { method: 'GET', url: 'https://api.example.com/api/trpc/users.search?input=%7B%22q%22%3A%22sam%22%7D', status_code: 200 } }))
      .toEqual({ category: 'fetch', data: { method: 'GET', url: 'https://api.example.com/api/trpc/users.search', status_code: 200 } });
    expect(sanitizeBreadcrumb({ category: 'navigation', data: { from: '/feed/search?q=bike', to: '/profile/sam#top' } }))
      .toEqual({ category: 'navigation', data: { from: '/feed/search', to: '/profile/sam' } });
  });

  it('drops console messages', () => {
    expect(sanitizeBreadcrumb({ category: 'console', message: 'Sent a message to sam' })).toBeNull();
  });

  it('leaves others alone', () => {
    expect(sanitizeBreadcrumb({ category: 'ui.click', message: 'ion-button' })).toEqual({ category: 'ui.click', message: 'ion-button' });
  });
});
