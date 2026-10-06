'use client';

import { getSupabase } from './supabase/client';
import { SUPABASE_URL } from './supabase/config';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

// Downscale and re-encode in the browser so we never store multi-megabyte
// camera originals. Falls back to the original file if the canvas is unavailable.
async function compress(file, maxSize) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (blob && blob.type === 'image/webp') return { blob, ext: 'webp', type: 'image/webp' };
  } catch {
    // fall through
  }
  return { blob: file, ext: file.type.split('/')[1].replace('jpeg', 'jpg'), type: file.type };
}

// Uploads to `${bucket}/${folder}/<random>.<ext>` and returns the public URL.
// Storage policies decide whether the caller may write to that folder.
// Throws Error('imageType' | 'imageSize') for invalid input.
export async function uploadImage({ bucket, folder, file, maxSize = 1400 }) {
  if (!ALLOWED.includes(file.type)) throw new Error('imageType');
  if (file.size > MAX_INPUT_BYTES) throw new Error('imageSize');

  const { blob, ext, type } = await compress(file, maxSize);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: type,
    cacheControl: '31536000', // unique names, so cache for a year
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Best-effort cleanup of a replaced image. Ignores URLs that are not ours.
export async function removeImage(url) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/`;
  if (!url || !url.startsWith(prefix)) return;
  const [bucket, ...rest] = url.slice(prefix.length).split('/');
  await getSupabase().storage.from(bucket).remove([decodeURIComponent(rest.join('/'))]);
}
