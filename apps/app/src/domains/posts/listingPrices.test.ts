import { describe, expect, it } from 'vitest';
import { parsePriceCents, priceFieldValue } from './listingPrices';

describe('parsePriceCents', () => {
  it.each([
    ['320', 32000],
    ['320.5', 32050],
    ['320.05', 32005],
    [' $1,200.00 ', 120000],
    ['0.99', 99],
  ])('reads %j as %d cents', (typed, cents) => {
    expect(parsePriceCents(typed)).toBe(cents);
  });

  it.each(['', '0', '0.00', 'abc', '12.345', '-5', '1e3', '$'])('rejects %j', (typed) => {
    expect(parsePriceCents(typed)).toBeNull();
  });
});

describe('priceFieldValue', () => {
  it('drops cents for whole dollars and keeps two places otherwise', () => {
    expect(priceFieldValue(32000)).toBe('320');
    expect(priceFieldValue(32050)).toBe('320.50');
    expect(priceFieldValue(99)).toBe('0.99');
  });
});
