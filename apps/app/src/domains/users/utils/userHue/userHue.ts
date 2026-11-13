/** A steady hue (0–359) per user, so the same person always looks the same: avatar and cover. */
export function userHue(userId: string): number {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}
