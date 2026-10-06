'use client';

import { useState } from 'react';
import { getSupabase } from '@/src/lib/supabase/client';
import { removeImage } from '@/src/lib/upload';
import { formatPhone, isValidPhone, phoneDigits } from '@/src/lib/format';
import { useAuth, useErrorMessage, useI18n, useToast } from '@/src/components/providers';
import { NewPasswordForm } from '@/src/components/auth-forms';
import { ImagePicker } from '@/src/components/image-picker';
import { Button, TextField } from '@/src/components/ui';

export default function AccountView() {
  const { t } = useI18n();
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const supabase = getSupabase();

  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(formatPhone(profile?.phone));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    const found = {};
    if (name.trim().length < 2) found.name = t('error.NAME_INVALID');
    if (phone && !isValidPhone(phone)) found.phone = t('error.PHONE_INVALID');
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim(), phone: phone ? phoneDigits(phone) : null })
      .eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    await refreshProfile();
    toast.success(t('common.saved'));
  };

  const saveAvatar = async (url) => {
    const previous = profile?.avatar_url;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    if (error) return toast.error(errorMessage(error));
    if (previous && previous !== url) removeImage(previous);
    await refreshProfile();
    toast.success(t('common.saved'));
  };

  const section = 'card p-5 sm:p-6';
  const heading = 'mb-4 text-base font-bold text-ink-900';

  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t('account.title')}</h1>

      <section className={section}>
        <h2 className={heading}>{t('account.profile')}</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          <ImagePicker
            className="w-28 shrink-0"
            round
            aspect="aspect-square"
            bucket="avatars"
            folder={user.id}
            maxSize={400}
            value={profile?.avatar_url}
            onChange={saveAvatar}
          />
          <form onSubmit={saveProfile} noValidate className="flex-1 space-y-4">
            <TextField label={t('checkout.fullName')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" maxLength={80} required />
            <TextField
              label={t('checkout.phone')}
              type="tel"
              inputMode="numeric"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              error={errors.phone}
              placeholder="0XXX XXX XX XX"
              autoComplete="tel"
              maxLength={14}
            />
            <TextField label={t('auth.email')} value={user.email} dir="ltr" disabled readOnly />
            <Button type="submit" loading={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </form>
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>{t('account.changePassword')}</h2>
        <div className="max-w-sm">
          <NewPasswordForm compact />
        </div>
      </section>
    </div>
  );
}
