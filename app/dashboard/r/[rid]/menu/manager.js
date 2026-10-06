'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { removeImage } from '@/src/lib/upload';
import { loc } from '@/src/lib/format';
import { useErrorMessage, useI18n, useToast } from '@/src/components/providers';
import { LangTabs, withFallbackName } from '@/src/components/dashboard-nav';
import { ImagePicker } from '@/src/components/image-picker';
import {
  Badge, Button, EmptyState, FoodImage, FormError, Modal, Price, SelectField, Skeleton, Switch, TextArea, TextField, cx, inputClass, useConfirm,
} from '@/src/components/ui';

const ITEM_FIELDS =
  '*, option_groups(id, name_en, name_ar, name_ku, min_select, max_select, sort_order, options(id, name_en, name_ar, name_ku, price_delta, is_available, sort_order))';
const bySort = (a, b) => a.sort_order - b.sort_order;
const toInt = (v, fallback = 0) => {
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function MenuManager({ restaurantId }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [confirm, confirmDialog] = useConfirm();
  const supabase = getSupabase();

  const [state, setState] = useState({ loading: true, error: '', categories: [], items: [] });
  const [showArchived, setShowArchived] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [categories, items] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order').order('created_at'),
      supabase.from('menu_items').select(ITEM_FIELDS).eq('restaurant_id', restaurantId).order('sort_order').order('created_at'),
    ]);
    const failed = categories.error || items.error;
    if (failed) return setState((s) => ({ ...s, loading: false, error: errorMessage(failed) }));
    setState({ loading: false, error: '', categories: categories.data, items: items.data });
  }, [supabase, restaurantId, errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(() => {
    const visible = state.items.filter((i) => showArchived || !i.archived_at);
    const known = new Set(state.categories.map((c) => c.id));
    const list = state.categories.map((c) => ({ category: c, items: visible.filter((i) => i.category_id === c.id) }));
    const orphans = visible.filter((i) => !known.has(i.category_id));
    if (orphans.length) list.push({ category: null, items: orphans });
    return list;
  }, [state, showArchived]);
  const archivedCount = state.items.filter((i) => i.archived_at).length;

  // optimistic single-field update with rollback
  const patchItem = async (item, patch, successKey) => {
    setBusyId(item.id);
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) }));
    const { error } = await supabase.from('menu_items').update(patch).eq('id', item.id);
    setBusyId(null);
    if (error) {
      toast.error(errorMessage(error));
      return load();
    }
    if (successKey) toast.success(t(successKey));
  };

  const archiveItem = async (item) => {
    const name = loc(item, 'name', lang);
    if (!(await confirm({ title: t('menu.archive'), body: t('menu.archiveConfirm', { name }), danger: true, confirmLabel: t('menu.archive') }))) return;
    patchItem(item, { archived_at: new Date().toISOString(), is_available: false }, 'menu.itemArchived');
  };

  const moveCategory = async (index, direction) => {
    const list = [...state.categories];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setState((s) => ({ ...s, categories: list.map((c, i) => ({ ...c, sort_order: i })) }));
    const results = await Promise.all(list.map((c, i) => supabase.from('categories').update({ sort_order: i }).eq('id', c.id)));
    const failed = results.find((r) => r.error);
    if (failed) {
      toast.error(errorMessage(failed.error));
      load();
    }
  };

  const deleteCategory = async (category) => {
    const name = loc(category, 'name', lang);
    if (!(await confirm({ title: t('common.delete'), body: t('menu.deleteCategoryConfirm', { name }), danger: true, confirmLabel: t('common.delete') }))) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) return toast.error(errorMessage(error));
    toast.success(t('menu.categoryDeleted'));
    load();
  };

  if (state.loading) return <div className="space-y-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (state.error) {
    return (
      <div className="space-y-3">
        <FormError>{state.error}</FormError>
        <Button variant="secondary" onClick={load}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditingItem({ category_id: state.categories[0]?.id || '' })} disabled={state.categories.length === 0}>
          <Plus size={18} aria-hidden /> {t('menu.addItem')}
        </Button>
        <Button variant="secondary" onClick={() => setEditingCategory({})}>
          <Plus size={18} aria-hidden /> {t('menu.addCategory')}
        </Button>
        {archivedCount > 0 && (
          <Switch className="ms-auto" checked={showArchived} onChange={setShowArchived} label={`${t('menu.showArchived')} (${archivedCount})`} />
        )}
      </div>

      {state.categories.length === 0 && state.items.length === 0 ? (
        <div className="card mt-6">
          <EmptyState title={t('menu.noCategories')} body={t('menu.noCategoriesBody')}>
            <Button onClick={() => setEditingCategory({})}><Plus size={18} aria-hidden /> {t('menu.addCategory')}</Button>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {sections.map(({ category, items }, index) => (
            <section key={category?.id || 'none'} className="card overflow-hidden">
              <header className="flex flex-wrap items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
                <h2 className="text-base font-bold text-ink-900">{category ? loc(category, 'name', lang) : t('menu.uncategorized')}</h2>
                <Badge>{items.length}</Badge>
                {category && !category.is_active && <Badge tone="warning">{t('menu.hidden')}</Badge>}
                {category && (
                  <div className="ms-auto flex items-center">
                    <IconButton label={t('menu.moveUp')} onClick={() => moveCategory(index, -1)} disabled={index === 0}><ArrowUp size={16} /></IconButton>
                    <IconButton label={t('menu.moveDown')} onClick={() => moveCategory(index, 1)} disabled={index === state.categories.length - 1}><ArrowDown size={16} /></IconButton>
                    <IconButton label={t('menu.editCategory')} onClick={() => setEditingCategory(category)}><Pencil size={16} /></IconButton>
                    <IconButton label={t('common.delete')} onClick={() => deleteCategory(category)} danger><Trash2 size={16} /></IconButton>
                    <Button size="sm" variant="soft" className="ms-2" onClick={() => setEditingItem({ category_id: category.id })}>
                      <Plus size={16} aria-hidden /> <span className="hidden sm:inline">{t('menu.addItem')}</span>
                    </Button>
                  </div>
                )}
              </header>

              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-500">{t('menu.noItems')}</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {items.map((item) => (
                    <li key={item.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', item.archived_at && 'bg-ink-50/60')}>
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                        <FoodImage src={item.image_url} alt="" sizes="56px" className={item.archived_at ? 'grayscale' : ''} />
                      </div>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="truncate font-semibold text-ink-900">{loc(item, 'name', lang)}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-600">
                          <Price value={item.price} className="font-medium" />
                          {item.option_groups.length > 0 && <span className="text-xs text-ink-500">· {t('menu.options')} ({item.option_groups.length})</span>}
                          {item.archived_at && <Badge>{t('menu.archived')}</Badge>}
                        </p>
                      </div>
                      {item.archived_at ? (
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => patchItem(item, { archived_at: null }, 'menu.itemRestored')}>
                          <ArchiveRestore size={16} aria-hidden /> {t('menu.restore')}
                        </Button>
                      ) : (
                        <>
                          <Switch
                            checked={item.is_available}
                            disabled={busyId === item.id}
                            onChange={(value) => patchItem(item, { is_available: value })}
                            label={item.is_available ? t('menu.available') : t('item.unavailable')}
                          />
                          <div className="flex">
                            <IconButton label={`${t('common.edit')}: ${loc(item, 'name', lang)}`} onClick={() => setEditingItem(item)}><Pencil size={16} /></IconButton>
                            <IconButton label={`${t('menu.archive')}: ${loc(item, 'name', lang)}`} onClick={() => archiveItem(item)} danger><Archive size={16} /></IconButton>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <CategoryModal
        category={editingCategory}
        restaurantId={restaurantId}
        nextSort={state.categories.length}
        onClose={() => setEditingCategory(null)}
        onSaved={() => {
          setEditingCategory(null);
          load();
        }}
      />
      <ItemModal
        item={editingItem}
        restaurantId={restaurantId}
        categories={state.categories}
        nextSort={state.items.length}
        onClose={() => setEditingItem(null)}
        onSaved={() => {
          setEditingItem(null);
          load();
        }}
      />
      {confirmDialog}
    </>
  );
}

function IconButton({ label, danger, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors disabled:pointer-events-none disabled:opacity-30',
        danger ? 'hover:bg-danger-50 hover:text-danger-600' : 'hover:bg-ink-100 hover:text-ink-900'
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- category
function CategoryModal({ category, restaurantId, nextSort, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState({});
  const [tab, setTab] = useState(lang);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!category) return;
    setForm({
      name_en: category.name_en || '', name_ar: category.name_ar || '', name_ku: category.name_ku || '',
      note_en: category.note_en || '', note_ar: category.note_ar || '', note_ku: category.note_ku || '',
      is_active: category.is_active ?? true,
    });
    setTab(lang);
    setError('');
  }, [category, lang]);

  const save = async (e) => {
    e.preventDefault();
    const values = withFallbackName(form);
    if (!values.name_en) return setError(t('common.required'));
    setSaving(true);
    const row = {
      ...values,
      note_en: form.note_en.trim() || null, note_ar: form.note_ar.trim() || null, note_ku: form.note_ku.trim() || null,
    };
    const query = getSupabase().from('categories');
    const { error: failure } = category.id
      ? await query.update(row).eq('id', category.id)
      : await query.insert({ ...row, restaurant_id: restaurantId, sort_order: nextSort });
    setSaving(false);
    if (failure) return setError(errorMessage(failure));
    toast.success(t('menu.categorySaved'));
    onSaved();
  };

  return (
    <Modal
      open={Boolean(category)}
      onClose={onClose}
      title={category?.id ? t('menu.editCategory') : t('menu.addCategory')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="category-form" loading={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      }
    >
      {category && (
        <form id="category-form" onSubmit={save} noValidate className="space-y-4">
          <LangTabs value={tab} onChange={setTab} filled={{ en: form.name_en, ku: form.name_ku, ar: form.name_ar }} />
          <TextField key={`n-${tab}`} label={t('menu.name')} value={form[`name_${tab}`] || ''} onChange={(e) => setForm({ ...form, [`name_${tab}`]: e.target.value })} error={error} maxLength={60} dir="auto" autoFocus />
          <TextField key={`o-${tab}`} label={t('menu.note')} optional value={form[`note_${tab}`] || ''} onChange={(e) => setForm({ ...form, [`note_${tab}`]: e.target.value })} maxLength={120} dir="auto" />
          <Switch checked={form.is_active ?? true} onChange={(v) => setForm({ ...form, is_active: v })} label={t('menu.available')} />
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- item
let localId = 0;
const newOption = () => ({ key: `new-${++localId}`, name_en: '', name_ar: '', name_ku: '', price_delta: 0, is_available: true });
const newGroup = () => ({ key: `new-${++localId}`, name_en: '', name_ar: '', name_ku: '', min_select: 0, max_select: 1, options: [newOption()] });

function ItemModal({ item, restaurantId, categories, nextSort, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState({});
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState(lang);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null); // set once a new item is inserted, so a retry updates it

  useEffect(() => {
    if (!item) return;
    setSavedId(item.id || null);
    setForm({
      name_en: item.name_en || '', name_ar: item.name_ar || '', name_ku: item.name_ku || '',
      description_en: item.description_en || '', description_ar: item.description_ar || '', description_ku: item.description_ku || '',
      price: item.price != null ? String(item.price) : '',
      category_id: item.category_id || '',
      prep_minutes: item.prep_minutes != null ? String(item.prep_minutes) : '',
      image_url: item.image_url || null,
      is_available: item.is_available ?? true,
    });
    setGroups(
      [...(item.option_groups || [])].sort(bySort).map((g) => ({ ...g, key: g.id, options: [...g.options].sort(bySort).map((o) => ({ ...o, key: o.id })) }))
    );
    setTab(lang);
    setErrors({});
    setFormError('');
  }, [item, lang]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const patchGroup = (key, patch) => setGroups((list) => list.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const patchOption = (groupKey, optionKey, patch) =>
    setGroups((list) => list.map((g) => (g.key === groupKey ? { ...g, options: g.options.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)) } : g)));

  const save = async (e) => {
    e.preventDefault();
    const values = withFallbackName(form);
    const found = {};
    if (!values.name_en) found.name = t('common.required');
    if (form.price === '' || toInt(form.price, -1) < 0) found.price = t('common.required');
    if (!form.category_id) found.category = t('common.required');

    // options: drop empty rows, then validate what is left
    const cleanGroups = groups
      .map((g) => ({ ...withFallbackName(g), options: g.options.map((o) => withFallbackName(o)).filter((o) => o.name_en) }))
      .filter((g) => g.name_en || g.options.length);
    if (cleanGroups.some((g) => !g.name_en || g.options.length === 0 || g.max_select < 1 || g.min_select > g.max_select || g.max_select > g.options.length)) {
      found.options = t('error.OPTIONS_INVALID');
    }
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setSaving(true);
    const supabase = getSupabase();
    const row = {
      name_en: values.name_en, name_ar: values.name_ar, name_ku: values.name_ku,
      description_en: form.description_en.trim() || null, description_ar: form.description_ar.trim() || null, description_ku: form.description_ku.trim() || null,
      price: toInt(form.price),
      category_id: form.category_id,
      prep_minutes: form.prep_minutes === '' ? null : Math.min(240, toInt(form.prep_minutes)),
      image_url: form.image_url,
      is_available: form.is_available,
    };
    const saved = savedId
      ? await supabase.from('menu_items').update(row).eq('id', savedId).select('id').single()
      : await supabase.from('menu_items').insert({ ...row, restaurant_id: restaurantId, sort_order: nextSort }).select('id').single();
    if (saved.error) {
      setSaving(false);
      return setFormError(errorMessage(saved.error));
    }
    setSavedId(saved.data.id);

    const { error: optionsError } = await supabase.rpc('save_item_options', {
      p_item: saved.data.id,
      p_groups: cleanGroups.map((g) => ({
        id: g.id, name_en: g.name_en, name_ar: g.name_ar, name_ku: g.name_ku, min_select: g.min_select, max_select: g.max_select,
        options: g.options.map((o) => ({ id: o.id, name_en: o.name_en, name_ar: o.name_ar, name_ku: o.name_ku, price_delta: toInt(o.price_delta), is_available: o.is_available })),
      })),
    });
    setSaving(false);
    if (optionsError) {
      // the item itself is saved; keep the dialog open so options can be fixed
      setFormError(errorMessage(optionsError));
      return;
    }
    if (item.image_url && item.image_url !== form.image_url) removeImage(item.image_url);
    toast.success(t('menu.itemSaved'));
    onSaved();
  };

  const small = cx(inputClass, 'h-10 px-3 text-sm');

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      size="lg"
      title={item?.id ? t('menu.editItem') : t('menu.addItem')}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" form="item-form" loading={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      }
    >
      {item && (
        <form id="item-form" onSubmit={save} noValidate className="space-y-5">
          <FormError>{formError}</FormError>
          <div className="grid gap-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <ImagePicker label={t('menu.image')} folder={`${restaurantId}/items`} value={form.image_url} onChange={(url) => set('image_url', url)} />
            <div className="space-y-4">
              <LangTabs value={tab} onChange={setTab} filled={{ en: form.name_en, ku: form.name_ku, ar: form.name_ar }} />
              <TextField key={`n-${tab}`} label={t('menu.name')} value={form[`name_${tab}`] || ''} onChange={(e) => set(`name_${tab}`, e.target.value)} error={errors.name} maxLength={100} dir="auto" />
              <TextArea key={`d-${tab}`} label={t('menu.description')} optional value={form[`description_${tab}`] || ''} onChange={(e) => set(`description_${tab}`, e.target.value)} maxLength={300} dir="auto" rows={2} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label={t('menu.price')} inputMode="numeric" dir="ltr" value={form.price || ''} onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, '').slice(0, 8))} error={errors.price} />
            <SelectField label={t('menu.category')} value={form.category_id || ''} onChange={(e) => set('category_id', e.target.value)} error={errors.category}>
              <option value="" disabled>—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{loc(c, 'name', lang)}</option>)}
            </SelectField>
            <TextField label={t('menu.prep')} optional inputMode="numeric" dir="ltr" value={form.prep_minutes || ''} onChange={(e) => set('prep_minutes', e.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
          </div>
          <Switch checked={form.is_available ?? true} onChange={(v) => set('is_available', v)} label={t('menu.available')} />

          <fieldset className="border-t border-ink-100 pt-5">
            <legend className="float-start mb-3 text-sm font-bold text-ink-900">{t('menu.options')}</legend>
            <div className="clear-both space-y-4">
              {errors.options && <FormError>{errors.options}</FormError>}
              {groups.map((group) => (
                <div key={group.key} className="rounded-xl border border-ink-200 bg-ink-50 p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-40 flex-1">
                      <span className="sr-only">{t('menu.groupName')}</span>
                      <input className={small} placeholder={t('menu.groupName')} value={group[`name_${tab}`] || ''} onChange={(e) => patchGroup(group.key, { [`name_${tab}`]: e.target.value })} maxLength={60} dir="auto" />
                    </label>
                    {[['min_select', t('menu.minSelect'), 0], ['max_select', t('menu.maxSelect'), 1]].map(([field, label, min]) => (
                      <label key={field} className="w-20 text-xs font-medium text-ink-600">
                        {label}
                        <input type="number" min={min} max={20} className={cx(small, 'mt-1')} dir="ltr" value={group[field]} onChange={(e) => patchGroup(group.key, { [field]: Math.max(min, Math.min(20, toInt(e.target.value, min))) })} />
                      </label>
                    ))}
                    <IconButton label={t('common.remove')} danger onClick={() => setGroups((list) => list.filter((g) => g.key !== group.key))}><Trash2 size={16} /></IconButton>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {group.options.map((option) => (
                      <li key={option.key} className="flex flex-wrap items-center gap-2">
                        <label className="min-w-32 flex-1">
                          <span className="sr-only">{t('menu.optionName')}</span>
                          <input className={small} placeholder={t('menu.optionName')} value={option[`name_${tab}`] || ''} onChange={(e) => patchOption(group.key, option.key, { [`name_${tab}`]: e.target.value })} maxLength={60} dir="auto" />
                        </label>
                        <label className="w-28">
                          <span className="sr-only">{t('menu.extraPrice')}</span>
                          <input className={small} inputMode="numeric" dir="ltr" placeholder={t('menu.extraPrice')} value={option.price_delta || ''} onChange={(e) => patchOption(group.key, option.key, { price_delta: toInt(e.target.value) })} />
                        </label>
                        <Switch checked={option.is_available} onChange={(v) => patchOption(group.key, option.key, { is_available: v })} />
                        <IconButton label={t('common.remove')} onClick={() => patchGroup(group.key, { options: group.options.filter((o) => o.key !== option.key) })}><X size={16} /></IconButton>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => patchGroup(group.key, { options: [...group.options, newOption()] })}>
                    <Plus size={16} aria-hidden /> {t('menu.addOption')}
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => setGroups((list) => [...list, newGroup()])}>
                <Plus size={16} aria-hidden /> {t('menu.addGroup')}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
