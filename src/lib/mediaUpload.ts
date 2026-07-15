/**
 * Resumable uploads to Supabase Storage with progress tracking.
 * Uses TUS protocol for large files to handle 4K+ media efficiently.
 */
import * as tus from 'tus-js-client';
import { supabase } from './supabaseClient';
import { formatUploadError, resolveContentType, RESUMABLE_UPLOAD_THRESHOLD } from './storage';

export type UploadProgressCallback = (percent: number) => void;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const TUS_CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB — Supabase recommended chunk size

function tusEndpoint(): string {
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  } catch {
    return `${supabaseUrl}/storage/v1/upload/resumable`;
  }
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión para subir archivos.');
  }
  return session.access_token;
}

function uploadViaTus(
  bucket: string,
  path: string,
  file: File,
  accessToken: string,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const contentType = resolveContentType(file);
    const upload = new tus.Upload(file, {
      endpoint: tusEndpoint(),
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType,
        cacheControl: '31536000',
      },
      chunkSize: TUS_CHUNK_SIZE,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0) {
          onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess: () => {
        onProgress?.(100);
        resolve();
      },
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0]);
      }
      upload.start();
    }).catch(reject);
  });
}

async function uploadDirect(
  bucket: string,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  onProgress?.(0);
  const contentType = resolveContentType(file);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    });
  if (error) throw new Error(formatUploadError(error));
  onProgress?.(100);
}

/** Upload a file to a Supabase Storage bucket with automatic resumable handling for large files. */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  try {
    if (file.size >= RESUMABLE_UPLOAD_THRESHOLD) {
      const token = await getAccessToken();
      await uploadViaTus(bucket, path, file, token, onProgress);
    } else {
      await uploadDirect(bucket, path, file, onProgress);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    throw new Error(formatUploadError(error));
  }
}

/** Run async tasks with a concurrency limit to avoid memory spikes. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
