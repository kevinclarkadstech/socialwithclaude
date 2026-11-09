/** Uploads one file to a presigned URL, with the Content-Type it was signed for. Throws if storage refuses it. */
export async function uploadToStorage({ url, blob, contentType }: { url: string; blob: Blob; contentType: string }) {
  const response = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
  if (!response.ok) {
    throw new Error(`The upload failed (${response.status}). Try again.`);
  }
}
