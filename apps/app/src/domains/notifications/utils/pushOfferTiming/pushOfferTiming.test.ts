import { beforeEach, describe, expect, it } from 'vitest';
import { pushOfferTiming } from './pushOfferTiming';

describe('pushOfferTiming', () => {
  beforeEach(() => localStorage.clear());

  it('offers once, then not again for 30 days', () => {
    const now = Date.parse('2026-11-18T12:00:00Z');
    expect(pushOfferTiming.canOffer(now)).toBe(true);
    pushOfferTiming.offered(now);
    expect(pushOfferTiming.canOffer(now + 29 * 86_400_000)).toBe(false);
    expect(pushOfferTiming.canOffer(now + 30 * 86_400_000)).toBe(true);
  });
});
