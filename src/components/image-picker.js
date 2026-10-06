'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { removeImage, uploadImage } from '@/src/lib/upload';
import { useErrorMessage, useI18n, useToast } from './providers';
import { Button, FoodImage, Spinner, cx } from './ui';

// Uploads immediately and reports the new public URL through onChange.
// The parent decides when to persist that URL.
export function ImagePicker({ value, onChange, bucket = 'media', folder, label, aspect = 'aspect-[4/3]', maxSize, className, round = false }) {
  const { t } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const uploaded = useRef(new Set()); // files added in this session can be cleaned up safely

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage({ bucket, folder, file, maxSize });
      if (uploaded.current.has(value)) removeImage(value);
      uploaded.current.add(url);
      onChange(url);
    } catch (error) {
      toast.error(['imageType', 'imageSize'].includes(error.message) ? t(`error.${error.message}`) : errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    if (uploaded.current.has(value)) removeImage(value);
    onChange(null);
  };

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium text-ink-800">{label}</p>}
      <div className={cx('relative overflow-hidden border border-ink-200 bg-ink-50', aspect, round ? 'rounded-full' : 'rounded-xl')}>
        <FoodImage src={value} alt="" sizes="320px" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner />
          </div>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} tabIndex={-1} aria-hidden />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
          <ImagePlus size={16} aria-hidden />
          {value ? t('menu.replaceImage') : t('menu.uploadImage')}
        </Button>
        {value && !round && (
          <Button size="sm" variant="dangerGhost" onClick={clear} disabled={busy} aria-label={t('menu.removeImage')}>
            <Trash2 size={16} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
