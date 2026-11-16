import type { UserProfileSummary } from '@myapp/shared/domains';

/**
 * The `candidates` someone can tag after typing "@" and `query`, matched as
 * the server does (users.suggestMentions): the username, first name or last
 * name starts with it, ignoring case. An exact username comes first, then
 * the rest by username. For when the candidates are already known, e.g. a
 * chat's members.
 */
export function matchMentionCandidates({ candidates, query, limit = 8 }: {
  candidates: UserProfileSummary[];
  query: string;
  limit?: number;
}): UserProfileSummary[] {
  const lowered = query.toLowerCase();
  const startsWithQuery = (part: string | null) => part !== null && part.toLowerCase().startsWith(lowered);
  return candidates
    .filter((user) => startsWithQuery(user.username) || startsWithQuery(user.firstName) || startsWithQuery(user.lastName))
    .sort((a, b) => Number(b.username === lowered) - Number(a.username === lowered) || a.username.localeCompare(b.username))
    .slice(0, limit);
}
