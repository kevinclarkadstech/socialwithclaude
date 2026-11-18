import { currentTermsVersion } from "../../constants";

/** The major part of a "major.minor" terms version. */
function major(version: string): number {
    return Number(version.split(".")[0]);
}

/**
 * Whether someone who agreed to `acceptedVersion` of the terms (null: never)
 * needs to agree again: only when the major version has gone up since.
 */
export function needsToAcceptTerms({ acceptedVersion, currentVersion = currentTermsVersion }: { acceptedVersion: string | null; currentVersion?: string }): boolean {
    return acceptedVersion === null || major(acceptedVersion) < major(currentVersion);
}
