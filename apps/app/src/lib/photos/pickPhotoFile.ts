/**
 * Opens the photo picker and resolves the chosen file, or null if cancelled.
 * Call it from a direct tap (a click handler, or showMenu's onSelect):
 * browsers only open the picker from one.
 */
export function pickPhotoFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
