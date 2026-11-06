import type { UserProfileSummary } from '@myapp/shared/domains';

/** "First Last", or "@username" when they haven't given a name. */
export function displayName(user: UserProfileSummary): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || `@${user.username}`;
}

/** One or two letters for an avatar: from the name, else the username. */
export function initials(user: UserProfileSummary): string {
  const fromName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part[0])
    .join('');
  return (fromName || user.username.slice(0, 2)).toUpperCase();
}
