'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { formatPhone, isValidPhone } from '@/src/lib/format';
import { useAuth, useErrorMessage, useI18n, useToast } from '@/src/components/providers';
import { Avatar, Badge, Button, FormError, Modal, Skeleton, TextField, useConfirm } from '@/src/components/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Manager accounts: the people who can log in and edit the menu.
// Customers never have accounts, so everyone listed here is staff.
export default function UsersPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [confirm, confirmDialog] = useConfirm();
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url, role, created_at')
      .order('created_at');
    setState({ loading: false, error: error ? errorMessage(error) : '', rows: data || [] });
  }, [errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row) => {
    const yes = await confirm({
      title: t('admin.removeUser'),
      body: t('admin.removeUserConfirm', { name: row.full_name || row.email }),
      danger: true,
      confirmLabel: t('common.remove'),
    });
    if (!yes) return;
    const { error } = await getSupabase().rpc('admin_delete_user', { p_user: row.id });
    if (error) return toast.error(errorMessage(error));
    toast.success(t('admin.userRemoved'));
    load();
  };

  if (state.loading) return <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <>
      <FormError>{state.error}</FormError>
      <Button onClick={() => setEditing({})}><Plus size={18} aria-hidden /> {t('admin.addUser')}</Button>

      <ul className="card mt-5 divide-y divide-ink-100">
        {state.rows.map((row) => {
          const self = row.id === user.id;
          return (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar src={row.avatar_url} name={row.full_name || row.email} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900">
                  {row.full_name || '—'}
                  {self && <Badge tone="brand">{t('admin.you')}</Badge>}
                </p>
                <p className="truncate text-xs text-ink-500" dir="ltr">
                  {row.email}{row.phone ? ` · ${formatPhone(row.phone)}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                <Pencil size={15} aria-hidden /> {t('common.edit')}
              </Button>
              <Button size="sm" variant="dangerGhost" onClick={() => remove(row)} disabled={self} aria-label={`${t('common.remove')}: ${row.full_name || row.email}`}>
                <Trash2 size={15} aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>

      <UserModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      {confirmDialog}
    </>
  );
}

function UserModal({ target, onClose, onSaved }) {
  const { t } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const isNew = target && !target.id;

  useEffect(() => {
    if (!target) return;
    setForm({ name: target.full_name || '', email: target.email || '', phone: formatPhone(target.phone), password: '' });
    setErrors({});
    setFormError('');
  }, [target]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = t('error.NAME_INVALID');
    if (!EMAIL.test(form.email.trim())) found.email = t('auth.invalidEmail');
    if (form.phone && !isValidPhone(form.phone)) found.phone = t('error.PHONE_INVALID');
    if ((isNew || form.password) && form.password.length < 8) found.password = t('auth.weakPassword');
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    const supabase = getSupabase();
    const { error } = isNew
      ? await supabase.rpc('admin_create_user', { p_email: form.email, p_password: form.password, p_full_name: form.name, p_phone: form.phone })
      : await supabase.rpc('admin_update_user', { p_user: target.id, p_full_name: form.name, p_phone: form.phone, p_email: form.email, p_password: form.password || null });
    setSaving(false);
    if (error) {
      if (error.message === 'EMAIL_TAKEN') return setErrors({ email: t('auth.emailTaken') });
      return setFormError(errorMessage(error));
    }
    toast.success(t('admin.userSaved'));
    onSaved();
  };

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={isNew ? t('admin.addUser') : t('admin.editUser')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="user-form" loading={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      }
    >
      {target && (
        <form id="user-form" onSubmit={save} noValidate className="space-y-4">
          <FormError>{formError}</FormError>
          <TextField label={t('checkout.fullName')} value={form.name} onChange={set('name')} error={errors.name} maxLength={80} autoComplete="off" autoFocus />
          <TextField label={t('auth.email')} type="email" dir="ltr" value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" />
          <TextField
            label={t('checkout.phone')}
            optional
            type="tel"
            inputMode="numeric"
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
            error={errors.phone}
            placeholder="0XXX XXX XX XX"
            maxLength={14}
          />
          <TextField
            label={isNew ? t('auth.password') : t('auth.newPassword')}
            optional={!isNew}
            type="text"
            dir="ltr"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint={isNew ? t('auth.weakPassword') : t('admin.passwordHint')}
            autoComplete="new-password"
          />
        </form>
      )}
    </Modal>
  );
}
