export const LANGS = ['ku', 'ar', 'en'];
export const DEFAULT_LANG = 'ku';
export const isRTL = (lang) => lang !== 'en';

// Pick the localised column (name_ku, name_ar, ...) with sensible fallbacks.
export function loc(row, field, lang) {
  if (!row) return '';
  return row[`${field}_${lang}`] || row[`${field}_en`] || row[`${field}_ku`] || row[`${field}_ar`] || '';
}

// "12,345 IQD" - always Latin digits so prices read the same in every language.
export function formatIQD(value) {
  return `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD`;
}

// 07504489892 -> 0750 448 98 92 (partial input is formatted progressively)
export function formatPhone(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ');
}
export const phoneDigits = (value) => String(value || '').replace(/\D/g, '');
export const isValidPhone = (value) => /^0\d{10}$/.test(phoneDigits(value));

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Only allow same-site relative redirects.
export function safeNext(next, fallback = '/') {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : fallback;
}

const minutesOf = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};

// Mirrors public.restaurant_is_open(): hours are campus local time.
export function isRestaurantOpen(r, now = new Date()) {
  if (!r || r.is_active === false || r.status === 'closed') return false;
  if (!r.opens_at || !r.closes_at || r.opens_at === r.closes_at) return true;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baghdad',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const cur = minutesOf(parts);
  const open = minutesOf(r.opens_at);
  const close = minutesOf(r.closes_at);
  return open < close ? cur >= open && cur < close : cur >= open || cur < close;
}

export const shortTime = (t) => (t ? String(t).slice(0, 5) : '');

export function formatDateTime(value, lang = 'en') {
  if (!value) return '';
  const locale = lang === 'ar' ? 'ar-IQ-u-nu-latn' : lang === 'ku' ? 'ckb-IQ-u-nu-latn' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' }).format(new Date(value));
  }
}

// Cart maths shared by the cart drawer and checkout. The database recomputes
// everything in place_order(); this is for display only.
export function unitPrice(item, options = []) {
  return (item?.price || 0) + options.reduce((s, o) => s + (o.price_delta || 0), 0);
}

export function cartTotals(lines, restaurant, discount = 0) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const deliveryFee = lines.length ? restaurant?.delivery_fee || 0 : 0;
  const applied = Math.min(discount || 0, subtotal);
  return {
    subtotal,
    deliveryFee,
    discount: applied,
    total: subtotal + deliveryFee - applied,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    belowMinimum: lines.length > 0 && subtotal < (restaurant?.min_order || 0),
  };
}

export const ORDER_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
export const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};
export const isActiveOrder = (status) => status !== 'delivered' && status !== 'cancelled';
