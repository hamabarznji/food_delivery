'use server';

import { getSupabaseServer } from '@/src/lib/supabase/server';
import { notifyNewOrder } from '@/src/lib/telegram';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

// Only ids and quantities are forwarded; the database prices the cart itself.
function cleanItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 40) return null;
  const out = [];
  for (const line of items) {
    const options = Array.isArray(line?.optionIds) ? line.optionIds : [];
    const quantity = Number(line?.quantity);
    if (!UUID.test(line?.itemId || '') || !options.every((o) => UUID.test(o)) || !Number.isInteger(quantity)) return null;
    out.push({ item_id: line.itemId, option_ids: options, quantity });
  }
  return out;
}

// Places a guest order. Returns { ok: true, orderId, token } or { ok: false, code }.
export async function placeOrder(input) {
  try {
    const items = cleanItems(input?.items);
    if (!items || !UUID.test(input.idempotencyKey || '')) return { ok: false, code: 'INVALID_INPUT' };

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.rpc('place_order', {
      p_idempotency_key: input.idempotencyKey,
      p_items: items,
      p_name: text(input.name, 80),
      p_phone: text(input.phone, 20),
      p_location_id: Number.isInteger(input.locationId) ? input.locationId : null,
      p_details: text(input.details, 200) || null,
      p_comment: text(input.comment, 500) || null,
      p_promo: text(input.promo, 20) || null,
    });
    if (error) {
      const known = /^[A-Z_]+$/.test(error.message);
      if (!known) console.error('place_order failed:', error);
      return { ok: false, code: known ? error.message : 'GENERIC' };
    }

    // a retried request returns the existing order: don't notify twice
    if (data.created) {
      const { data: order } = await supabase.rpc('track_order', { p_order: data.order_id, p_token: data.token });
      if (order) await notifyNewOrder(order).catch((e) => console.error(e));
    }

    return { ok: true, orderId: data.order_id, token: data.token };
  } catch (e) {
    console.error('placeOrder failed:', e);
    return { ok: false, code: 'GENERIC' };
  }
}
