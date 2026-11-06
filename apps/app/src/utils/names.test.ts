import { describe, expect, it } from 'vitest';
import { displayName, initials } from './names';

const user = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', username: 'kev_c', firstName: null, lastName: null };

describe('displayName', () => {
  it('uses the name when there is one', () => {
    expect(displayName({ ...user, firstName: 'Kevin', lastName: 'Clark' })).toBe('Kevin Clark');
    expect(displayName({ ...user, firstName: 'Kevin' })).toBe('Kevin');
  });
  it('falls back to the username', () => {
    expect(displayName(user)).toBe('@kev_c');
  });
});

describe('initials', () => {
  it('takes the first letters of the name, else of the username', () => {
    expect(initials({ ...user, firstName: 'Kevin', lastName: 'Clark' })).toBe('KC');
    expect(initials(user)).toBe('KE');
  });
});
