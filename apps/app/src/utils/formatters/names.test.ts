import { describe, expect, it } from 'vitest';
import { displayName, initials } from './names';

const unnamed = { username: 'kev_c', firstName: null, lastName: null };

describe('displayName', () => {
  it('uses the name when there is one', () => {
    expect(displayName({ ...unnamed, firstName: 'Kevin', lastName: 'Clark' })).toBe('Kevin Clark');
    expect(displayName({ ...unnamed, firstName: 'Kevin' })).toBe('Kevin');
  });
  it('falls back to the username', () => {
    expect(displayName(unnamed)).toBe('@kev_c');
  });
});

describe('initials', () => {
  it('takes the first letters of the name, else of the username', () => {
    expect(initials({ ...unnamed, firstName: 'Kevin', lastName: 'Clark' })).toBe('KC');
    expect(initials(unnamed)).toBe('KE');
  });
});
