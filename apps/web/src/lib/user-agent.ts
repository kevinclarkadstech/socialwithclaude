// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
const BROWSERS: [RegExp, string][] = [
    [/Edg(e|A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/SamsungBrowser\//, "Samsung Internet"],
    [/Firefox\/|FxiOS\//, "Firefox"],
    [/Chrome\/|CriOS\//, "Chrome"],
    [/Version\/[\d.]+.*Safari\//, "Safari"],
];

// iPhone and iPad user agents also say "Mac OS X".
const SYSTEMS: [RegExp, string][] = [
    [/iPhone/, "iPhone"],
    [/iPad/, "iPad"],
    [/Android/, "Android"],
    [/Windows/, "Windows"],
    [/CrOS/, "ChromeOS"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Linux/, "Linux"],
];

/**
 * A short description of a browser from its user agent, e.g. "Chrome on
 * macOS" or "Safari on iPhone". Good enough to tell your devices apart, not
 * exact; unknown parts are left out ("Unknown device" if nothing matches).
 */
export function describeUserAgent(userAgent: string | null): string {
    if (!userAgent) return "Unknown device";
    const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
    const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
    if (browser && system) return `${browser} on ${system}`;
    return browser ?? system ?? "Unknown device";
}
