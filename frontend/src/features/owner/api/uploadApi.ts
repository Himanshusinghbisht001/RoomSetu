/**
 * uploadApi — sends image files to the backend upload endpoint.
 *
 * SECURITY:
 *  - Uses the existing `apiClient` which automatically attaches the in-memory
 *    Bearer access token. No additional auth logic needed here.
 *  - Never sends blobs back to the server as permanent URLs. This file only
 *    deals with actual File objects.
 *  - Never reads or exposes Cloudinary credentials — those stay backend-only.
 */

import { apiClient } from '../../../lib/api/client.js';

export interface UploadImagesResponse {
  success: true;
  data: {
    urls: string[];
  };
}

/**
 * Uploads one or more File objects to the backend, which forwards them to
 * Cloudinary and returns permanent HTTPS URLs.
 *
 * @param files  Array of File objects (1–4, already client-validated)
 * @returns      Array of permanent Cloudinary HTTPS URLs in the same order
 * @throws       Axios error with a user-friendly message from the API
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const res = await apiClient.post<UploadImagesResponse>('/uploads/images', formData, {
    headers: {
      // Let the browser set the correct multipart boundary automatically.
      // Explicitly deleting Content-Type here ensures axios does not override it.
      'Content-Type': undefined as unknown as string,
    },
  });

  return res.data.data.urls;
}
