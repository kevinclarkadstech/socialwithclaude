/**
 * How old someone born in `birthMonth` (1–12) of `birthYear` is on `today`,
 * in whole years. Only the month is known, so their birthday counts as the
 * last day of it: during their birth month they're still the younger age.
 */
export function ageInYears({ birthYear, birthMonth, today = new Date() }: { birthYear: number; birthMonth: number; today?: Date }): number {
    const years = today.getUTCFullYear() - birthYear;
    const month = today.getUTCMonth() + 1;
    return month > birthMonth ? years : years - 1;
}
