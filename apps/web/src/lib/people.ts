/** The profile fields every author/member shape has. */
export type PersonSummary = {
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
};

/** Full name, or the username when no name is set. */
export function displayName(person: PersonSummary) {
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username;
}

/** Up to two initials from the display name. */
export function initials(person: PersonSummary) {
    return displayName(person)
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}
