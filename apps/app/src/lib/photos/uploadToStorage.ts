import { unexpectedError } from '@myapp/shared/error-handling';
import { AppErrorThrown } from '../api/results';

/** Uploads one file to a presigned URL, with the Content-Type it was signed for. Throws (with a message to show) if storage refuses it. */
export async function uploadToStorage({ url, blob, contentType }: { url: string; blob: Blob; contentType: string }) {
  const response = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
  if (!response.ok) {
    throw new AppErrorThrown(unexpectedError("A photo didn't upload. Try again.", { status: response.status }));
  }
}
