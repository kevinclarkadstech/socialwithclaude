/**
 * Cents from a price as typed: "320", "320.5", "$1,200.00". Null for
 * anything else, or for zero (a free item is listed as Free).
 */
export function parsePriceCents(typed: string): number | null {
  const plain = typed.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) {
    return null;
  }
  const [dollars, cents = ''] = plain.split('.');
  const total = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  return total > 0 && Number.isSafeInteger(total) ? total : null;
}

/** A price in cents as it reads in the price field: 32000 is "320", 32050 is "320.50". */
export function priceFieldValue(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
