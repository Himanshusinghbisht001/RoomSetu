/**
 * Upload Service — Cloudinary integration
 *
 * Credentials are validated lazily (at call time, not at startup) so that the
 * server can start without Cloudinary vars present. If they are absent the
 * upload endpoint returns a clean 503 instead of crashing the process.
 *
 * SECURITY RULES (enforced here):
 *  - CLOUDINARY_API_SECRET is read from env once and never returned, logged,
 *    or included in any error message.
 *  - Only the permanent HTTPS URL is returned to callers.
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

// ── Types ────────────────────────────────────────────────────────────────────

export class UploadServiceUnavailableError extends Error {
  constructor() {
    super('Image upload service is not configured.');
    this.name = 'UploadServiceUnavailableError';
  }
}

export class UploadFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadFailedError';
  }
}

// ── Configuration check (lazy) ────────────────────────────────────────────────

/**
 * Returns true if all three required Cloudinary env vars are present and non-empty.
 * Does NOT throw — callers decide how to react.
 */
export function isCloudinaryConfigured(): boolean {
  return (
    !!env.CLOUDINARY_CLOUD_NAME &&
    !!env.CLOUDINARY_API_KEY &&
    !!env.CLOUDINARY_API_SECRET
  );
}

// ── Internal: configure SDK lazily ───────────────────────────────────────────

let configured = false;

function ensureConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new UploadServiceUnavailableError();
  }
  if (!configured) {
    // Configure once; after this cloudinary uses these settings globally.
    // Credentials are NOT logged here or anywhere in this module.
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key:    env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure:     true, // always use HTTPS URLs
    });
    configured = true;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Uploads a single image buffer to Cloudinary and returns the permanent HTTPS URL.
 *
 * @param buffer   Raw file bytes (from multer memory storage)
 * @param mimetype Validated MIME type, e.g. "image/jpeg"
 * @returns        Permanent Cloudinary HTTPS URL
 *
 * @throws UploadServiceUnavailableError  — credentials missing
 * @throws UploadFailedError              — Cloudinary rejected the upload
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  ensureConfigured();

  // Derive Cloudinary resource format from MIME type
  const formatMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
  };
  const format = formatMap[mimetype] ?? 'jpg';

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'roomsetu/rooms',
        resource_type: 'image',
        format,
        // Limit transformations server-side as well
        overwrite:     false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          // Do NOT include raw Cloudinary error details — they may contain
          // account/credential information. Log only a sanitised message.
          reject(new UploadFailedError('Failed to upload image. Please try again.'));
          return;
        }
        // secure_url is always HTTPS when secure: true is set
        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}

/**
 * Uploads multiple image buffers concurrently.
 * All uploads run in parallel; rejects if any single upload fails.
 */
export async function uploadImageBuffers(
  files: Array<{ buffer: Buffer; mimetype: string }>,
): Promise<string[]> {
  return Promise.all(
    files.map(({ buffer, mimetype }) => uploadImageBuffer(buffer, mimetype)),
  );
}
