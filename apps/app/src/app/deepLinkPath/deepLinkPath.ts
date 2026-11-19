/**
 * The app route a link opens: its path (with any query and #fragment) when
 * it's on the app's own web address, `publicUrl`; null for any other site
 * or a link that isn't a web address.
 */
export function deepLinkPath({ url, publicUrl }: { url: string; publicUrl: string }): string | null {
  let link: URL;
  let ours: URL;
  try {
    link = new URL(url);
    ours = new URL(publicUrl);
  } catch {
    return null;
  }
  if (link.origin !== ours.origin) {
    return null;
  }
  return `${link.pathname}${link.search}${link.hash}`;
}
