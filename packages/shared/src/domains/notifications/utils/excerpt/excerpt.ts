/**
 * The start of `text`, at most `max` characters: whole words only, with "…"
 * when it was cut (a single word longer than that is cut where it has to be).
 */
export function excerpt(text: string, max: number): string {
    const trimmed = text.trim().replace(/\s+/g, " ");
    if (trimmed.length <= max) {
        return trimmed;
    }
    const cut = trimmed.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}
