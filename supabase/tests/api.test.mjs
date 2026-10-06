// End-to-end database tests: run supabase-js against real Postgres + GoTrue +
// PostgREST with the project's migrations applied (see scripts/test-db.sh).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { startGateway, SUPABASE_URL, ANON_KEY, SERVICE_KEY, DB_URL } from './harness/gateway.mjs';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(SUPABASE_URL, SERVICE_KEY, opts);
const anon = createClient(SUPABASE_URL, ANON_KEY, opts);
const run = randomUUID().slice(0, 8);
const PASSWORD = 'correct-horse-9';

let gateway;
const u = {}; // signed-in clients by name, each with .id
let r1, r2, cat1, burger, fries, sizeLarge, extraCheese, otherItem, locationId;

const sql = (q) => execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-Atqc', q], { encoding: 'utf8' }).trim();
const ok = (res) => {
  assert.equal(res.error, null, res.error?.message);
  return res.data;
};
const denied = (res, label) => {
  const blocked = res.error || (Array.isArray(res.data) && res.data.length === 0) || res.data === null;
  assert.ok(blocked, `${label}: expected the request to be rejected or affect no rows`);
};
const rpcError = async (promise, code) => {
  const { error } = await promise;
  assert.ok(error, `expected ${code}`);
  assert.equal(error.message, code);
};

async function makeUser(name, role) {
  const email = `${name}-${run}@test.local`;
  const created = ok(
    await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      // "role" here must be ignored by the profile trigger
      user_metadata: { full_name: `Test ${name}`, phone: '0750 123 45 67', role: 'admin' },
    })
  );
  const id = created.user.id;
  if (role !== 'customer') ok(await service.from('profiles').update({ role }).eq('id', id).select());
  const client = createClient(SUPABASE_URL, ANON_KEY, opts);
  ok(await client.auth.signInWithPassword({ email, password: PASSWORD }));
  client.id = id;
  client.email = email;
  u[name] = client;
}

const orderArgs = (extra = {}) => ({
  p_idempotency_key: randomUUID(),
  p_name: 'Sara Ahmed',
  p_phone: '0750 448 98 92',
  p_location_id: locationId,
  p_details: 'Room 12',
  p_comment: null,
  p_promo: null,
  ...extra,
});

before(async () => {
  gateway = await startGateway();
  await Promise.all([
    makeUser('alice', 'customer'),
    makeUser('bob', 'customer'),
    makeUser('vendor1', 'vendor'),
    makeUser('vendor2', 'vendor'),
    makeUser('admin', 'admin'),
  ]);
  locationId = ok(await anon.from('delivery_locations').select('id').limit(1).single()).id;
});

after(() => gateway?.close());

test('signup trigger creates a customer profile and ignores role metadata', async () => {
  const profile = ok(await u.alice.from('profiles').select('*').eq('id', u.alice.id).single());
  assert.equal(profile.role, 'customer');
  assert.equal(profile.full_name, 'Test alice');
  assert.equal(profile.phone, '07501234567');
  assert.equal(profile.email, u.alice.email);
});

test('public sign-up through the Auth API works and logs in', async () => {
  const c = createClient(SUPABASE_URL, ANON_KEY, opts);
  const email = `signup-${run}@test.local`;
  const { data, error } = await c.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: 'New Student' } } });
  assert.equal(error, null);
  assert.ok(data.session, 'session issued');
  const profile = ok(await c.from('profiles').select('role, full_name').single());
  assert.deepEqual(profile, { role: 'customer', full_name: 'New Student' });
  ok(await c.auth.signOut());
  const { error: bad } = await c.auth.signInWithPassword({ email, password: 'wrong-password' });
  assert.ok(bad, 'wrong password rejected');
});

test('profiles are private and roles cannot be self-escalated', async () => {
  const others = ok(await u.alice.from('profiles').select('id'));
  assert.deepEqual(others.map((p) => p.id), [u.alice.id]);
  assert.deepEqual(ok(await anon.from('profiles').select('id').then((r) => (r.error ? { data: [], error: null } : r))), []);

  const esc = await u.alice.from('profiles').update({ role: 'admin' }).eq('id', u.alice.id).select();
  assert.ok(esc.error, 'role escalation must fail');
  denied(await u.alice.from('profiles').update({ full_name: 'Hacked' }).eq('id', u.bob.id).select(), 'edit other profile');
  ok(await u.alice.from('profiles').update({ full_name: 'Alice A.' }).eq('id', u.alice.id).select().single());

  // admins can see everyone and change roles
  assert.ok(ok(await u.admin.from('profiles').select('id')).length >= 5);
});

test('only admins create restaurants; vendors manage only their own', async () => {
  const base = { name_en: 'Test Grill', delivery_fee: 1000, min_order: 3000 };
  denied(await u.alice.from('restaurants').insert({ ...base, slug: `x-${run}` }).select(), 'customer creates restaurant');
  denied(await u.vendor1.from('restaurants').insert({ ...base, slug: `y-${run}` }).select(), 'vendor creates restaurant');
  denied(await anon.from('restaurants').insert({ ...base, slug: `z-${run}` }).select(), 'anon creates restaurant');

  r1 = ok(await u.admin.from('restaurants').insert({ ...base, slug: `grill-${run}`, owner_id: u.vendor1.id }).select().single());
  r2 = ok(await u.admin.from('restaurants').insert({ ...base, name_en: 'Other Place', slug: `other-${run}`, owner_id: u.vendor2.id, min_order: 0 }).select().single());

  ok(await u.vendor1.from('restaurants').update({ description_en: 'Charcoal grill', status: 'busy' }).eq('id', r1.id).select().single());
  ok(await u.vendor1.from('restaurants').update({ status: 'open' }).eq('id', r1.id).select().single());
  denied(await u.vendor1.from('restaurants').update({ description_en: 'pwned' }).eq('id', r2.id).select(), 'vendor edits other restaurant');
  denied(await u.alice.from('restaurants').update({ delivery_fee: 0 }).eq('id', r1.id).select(), 'customer edits restaurant');

  for (const patch of [{ is_featured: true }, { owner_id: u.alice.id }, { rating_avg: 5 }, { is_active: false }]) {
    const res = await u.vendor1.from('restaurants').update(patch).eq('id', r1.id).select();
    assert.ok(res.error, `vendor must not change ${Object.keys(patch)[0]}`);
  }
  denied(await u.vendor1.from('restaurants').delete().eq('id', r1.id).select(), 'vendor deletes restaurant');
});

test('menu CRUD is limited to the managing vendor', async () => {
  cat1 = ok(await u.vendor1.from('categories').insert({ restaurant_id: r1.id, name_en: 'Burgers', name_ku: 'بەرگر' }).select().single());
  denied(await u.vendor1.from('categories').insert({ restaurant_id: r2.id, name_en: 'Nope' }).select(), 'vendor adds category elsewhere');
  denied(await u.alice.from('categories').insert({ restaurant_id: r1.id, name_en: 'Nope' }).select(), 'customer adds category');

  const item = { restaurant_id: r1.id, category_id: cat1.id, name_en: 'Beef Burger', price: 5000 };
  burger = ok(await u.vendor1.from('menu_items').insert(item).select().single());
  fries = ok(await u.vendor1.from('menu_items').insert({ ...item, name_en: 'Fries', price: 2000 }).select().single());
  denied(await u.alice.from('menu_items').insert(item).select(), 'customer adds item');
  denied(await u.vendor2.from('menu_items').insert(item).select(), 'other vendor adds item');
  denied(await u.vendor2.from('menu_items').update({ price: 1 }).eq('id', burger.id).select(), 'other vendor edits item');
  denied(await u.alice.from('menu_items').delete().eq('id', burger.id).select(), 'customer deletes item');
  assert.ok((await u.vendor1.from('menu_items').update({ order_count: 999 }).eq('id', burger.id).select()).error, 'order_count is not writable');

  // a category from another restaurant cannot be attached
  const cat2 = ok(await u.vendor2.from('categories').insert({ restaurant_id: r2.id, name_en: 'Wraps' }).select().single());
  assert.ok((await u.admin.from('menu_items').update({ category_id: cat2.id }).eq('id', burger.id).select()).error);
  otherItem = ok(await u.vendor2.from('menu_items').insert({ restaurant_id: r2.id, category_id: cat2.id, name_en: 'Falafel Wrap', price: 2500 }).select().single());

  const updated = ok(await u.vendor1.from('menu_items').update({ price: 5500, description_en: 'Double patty' }).eq('id', burger.id).select().single());
  assert.equal(updated.price, 5500);
  assert.ok(ok(await anon.from('menu_items').select('id').eq('restaurant_id', r1.id)).length === 2, 'public can read the menu');
});

test('options are saved atomically by the owner only', async () => {
  const groups = [
    { name_en: 'Size', min_select: 1, max_select: 1, options: [{ name_en: 'Regular', price_delta: 0 }, { name_en: 'Large', price_delta: 1000 }] },
    { name_en: 'Extras', min_select: 0, max_select: 2, options: [{ name_en: 'Cheese', price_delta: 500 }, { name_en: 'Egg', price_delta: 750 }] },
  ];
  await rpcError(u.vendor2.rpc('save_item_options', { p_item: burger.id, p_groups: groups }), 'FORBIDDEN');
  await rpcError(u.alice.rpc('save_item_options', { p_item: burger.id, p_groups: groups }), 'FORBIDDEN');
  ok(await u.vendor1.rpc('save_item_options', { p_item: burger.id, p_groups: groups }));

  const saved = ok(await anon.from('option_groups').select('*, options(*)').eq('item_id', burger.id).order('sort_order'));
  assert.equal(saved.length, 2);
  sizeLarge = saved[0].options.find((o) => o.name_en === 'Large');
  extraCheese = saved[1].options.find((o) => o.name_en === 'Cheese');

  // re-saving keeps ids of surviving rows and removes dropped ones
  const next = [{ ...saved[0], options: saved[0].options }, { ...saved[1], options: saved[1].options.filter((o) => o.name_en === 'Cheese') }];
  ok(await u.vendor1.rpc('save_item_options', { p_item: burger.id, p_groups: next }));
  const after = ok(await anon.from('options').select('id, name_en').in('group_id', saved.map((g) => g.id)));
  assert.equal(after.length, 3);
  assert.ok(after.some((o) => o.id === sizeLarge.id));

  denied(await u.alice.from('options').update({ price_delta: 0 }).eq('id', sizeLarge.id).select(), 'customer edits option');
});

// ---- guest ordering -------------------------------------------------------
const line = (item, options = [], quantity = 1) => ({ item_id: item.id, option_ids: options, quantity });
const cart = () => [line(burger, [sizeLarge.id, extraCheese.id], 2), line(fries, [], 2)]; // 2 x 7000 + 2 x 2000

test('guest carts are validated against the live menu', async () => {
  const order = (items) => anon.rpc('place_order', orderArgs({ p_items: items }));
  await rpcError(order([]), 'CART_EMPTY');
  await rpcError(order('nope'), 'CART_EMPTY');
  await rpcError(order([{ item_id: 'not-a-uuid', quantity: 1 }]), 'CART_INVALID');
  await rpcError(order([line(burger)]), 'OPTIONS_INVALID'); // size is required
  await rpcError(order([line(burger, [sizeLarge.id, randomUUID()])]), 'OPTIONS_INVALID');
  await rpcError(order([line(fries, [], 0)]), 'QUANTITY_INVALID');
  await rpcError(order([line(fries, [], 500)]), 'QUANTITY_INVALID');
  await rpcError(order([{ item_id: fries.id, quantity: '1; drop table orders' }]), 'QUANTITY_INVALID');
  await rpcError(order([line(fries, [], 2), line(otherItem)]), 'CART_OTHER_RESTAURANT');
  await rpcError(order([{ item_id: randomUUID(), quantity: 1 }]), 'ITEM_UNAVAILABLE');
  await rpcError(order(Array.from({ length: 41 }, () => line(fries))), 'CART_INVALID');
});

test('promotions: vendor-scoped management and server-side validation', async () => {
  const promo = { restaurant_id: r1.id, code: `SAVE${run.toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 20), title_en: '10% off', discount_type: 'percent', value: 10, max_discount: 1000, min_subtotal: 5000 };
  denied(await u.alice.from('promotions').insert(promo).select(), 'customer creates promo');
  denied(await anon.from('promotions').insert(promo).select(), 'guest creates promo');
  denied(await u.vendor2.from('promotions').insert(promo).select(), 'other vendor creates promo');
  denied(await u.vendor1.from('promotions').insert({ ...promo, restaurant_id: null, code: 'PLATFORM1' }).select(), 'vendor creates platform promo');
  const created = ok(await u.vendor1.from('promotions').insert(promo).select().single());
  assert.ok((await u.vendor1.from('promotions').update({ used_count: 0 }).eq('id', created.id).select()).error, 'used_count not writable');

  // 18000 -> 10% = 1800, capped at 1000
  const preview = ok(await anon.rpc('preview_promo', { p_items: cart(), p_code: promo.code.toLowerCase() }));
  assert.equal(preview.discount, 1000);
  await rpcError(anon.rpc('preview_promo', { p_items: cart(), p_code: 'NOSUCHCODE' }), 'PROMO_INVALID');
  await rpcError(anon.rpc('preview_promo', { p_items: [line(fries)], p_code: promo.code }), 'PROMO_MIN_SUBTOTAL');
  u.promoCode = promo.code;
});

test('a guest can place an order: totals are computed server-side and retries are idempotent', async () => {
  await rpcError(anon.rpc('place_order', orderArgs({ p_items: cart(), p_phone: '12345' })), 'PHONE_INVALID');
  await rpcError(anon.rpc('place_order', orderArgs({ p_items: cart(), p_name: ' ' })), 'NAME_INVALID');
  await rpcError(anon.rpc('place_order', orderArgs({ p_items: cart(), p_location_id: 999999 })), 'LOCATION_INVALID');

  // prices sent by a tampering client are simply ignored
  const tampered = cart().map((l) => ({ ...l, unit_price: 1, price: 1 }));
  const args = orderArgs({ p_items: tampered, p_promo: u.promoCode });
  // double-click / retry: both calls must resolve to the same single order
  const [a, b] = await Promise.all([anon.rpc('place_order', args), anon.rpc('place_order', args)]);
  const first = ok(a);
  const second = ok(b);
  assert.equal(first.order_id, second.order_id);
  assert.equal([first.created, second.created].filter(Boolean).length, 1);
  u.orderId = first.order_id;
  u.token = first.token;

  const order = ok(await anon.rpc('track_order', { p_order: u.orderId, p_token: u.token }));
  assert.equal(order.subtotal, 18000);
  assert.equal(order.delivery_fee, 1000);
  assert.equal(order.discount, 1000);
  assert.equal(order.total, 18000);
  assert.equal(order.status, 'pending');
  assert.equal(order.customer_phone, '07504489892');
  assert.equal(order.order_items.length, 2);
  const burgerLine = order.order_items.find((i) => i.name_en === 'Beef Burger');
  assert.equal(burgerLine.unit_price, 7000);
  assert.equal(burgerLine.options.length, 2);
  assert.equal(order.order_events.length, 1);
  assert.equal(order.tracking_token, undefined);
  assert.equal(ok(await u.vendor1.from('promotions').select('used_count').eq('code', u.promoCode).single()).used_count, 1);

  // promo is limited to one use per phone number
  await rpcError(anon.rpc('place_order', orderArgs({ p_items: [line(fries, [], 3)], p_promo: u.promoCode })), 'PROMO_ALREADY_USED');
});

test('orders are private: only the token holder and the managing restaurant can read them', async () => {
  assert.equal(ok(await anon.rpc('track_order', { p_order: u.orderId, p_token: randomUUID() })), null);
  assert.ok((await anon.from('orders').select('id')).error, 'guests cannot query the orders table');
  assert.ok((await anon.from('order_items').select('id')).error);
  assert.deepEqual(ok(await u.alice.from('orders').select('id')), [], 'a signed-in non-staff user sees nothing');
  assert.deepEqual(ok(await u.vendor2.from('orders').select('id').eq('id', u.orderId)), []);
  assert.deepEqual(ok(await u.vendor2.from('order_items').select('id').eq('order_id', u.orderId)), []);
  assert.equal(ok(await u.vendor1.from('orders').select('id').eq('id', u.orderId)).length, 1);
  assert.equal(ok(await u.admin.from('orders').select('id').eq('id', u.orderId)).length, 1);

  for (const client of [anon, u.alice, u.vendor1]) {
    assert.ok((await client.from('orders').update({ total: 1 }).eq('id', u.orderId).select()).error, 'orders are not directly writable');
    assert.ok((await client.from('orders').delete().eq('id', u.orderId).select()).error);
    assert.ok((await client.from('order_items').insert({ order_id: u.orderId, name_en: 'x', unit_price: 0, quantity: 1, line_total: 0 }).select()).error);
  }
});

test('order status workflow is enforced', async () => {
  await rpcError(anon.rpc('set_order_status', { p_order: u.orderId, p_status: 'delivered' }), 'permission denied for function set_order_status');
  await rpcError(u.alice.rpc('set_order_status', { p_order: u.orderId, p_status: 'delivered' }), 'FORBIDDEN');
  await rpcError(u.vendor2.rpc('set_order_status', { p_order: u.orderId, p_status: 'confirmed' }), 'FORBIDDEN');
  await rpcError(u.vendor1.rpc('set_order_status', { p_order: u.orderId, p_status: 'delivered' }), 'STATUS_TRANSITION_INVALID');
  await rpcError(anon.rpc('rate_order', { p_order: u.orderId, p_token: u.token, p_rating: 5 }), 'ORDER_NOT_RATEABLE');
  await rpcError(anon.rpc('cancel_order', { p_order: u.orderId, p_token: randomUUID() }), 'FORBIDDEN');

  for (const s of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']) {
    ok(await u.vendor1.rpc('set_order_status', { p_order: u.orderId, p_status: s }));
    if (s === 'confirmed') await rpcError(anon.rpc('cancel_order', { p_order: u.orderId, p_token: u.token }), 'ORDER_NOT_CANCELLABLE');
  }
  await rpcError(u.vendor1.rpc('set_order_status', { p_order: u.orderId, p_status: 'cancelled' }), 'STATUS_TRANSITION_INVALID');
  assert.equal(ok(await anon.rpc('track_order', { p_order: u.orderId, p_token: u.token })).order_events.length, 6);

  await rpcError(anon.rpc('rate_order', { p_order: u.orderId, p_token: randomUUID(), p_rating: 5 }), 'FORBIDDEN');
  await rpcError(anon.rpc('rate_order', { p_order: u.orderId, p_token: u.token, p_rating: 9 }), 'INVALID_INPUT');
  ok(await anon.rpc('rate_order', { p_order: u.orderId, p_token: u.token, p_rating: 4 }));
  await rpcError(anon.rpc('rate_order', { p_order: u.orderId, p_token: u.token, p_rating: 1 }), 'ORDER_NOT_RATEABLE');
  const rated = ok(await anon.from('restaurants').select('rating_avg, rating_count').eq('id', r1.id).single());
  assert.deepEqual([Number(rated.rating_avg), rated.rating_count], [4, 1]);

  const stats = ok(await u.vendor1.rpc('restaurant_stats', { p_restaurant: r1.id }));
  assert.equal(stats.total_orders, 1);
  assert.equal(stats.today_revenue, 18000);
  await rpcError(u.alice.rpc('restaurant_stats', { p_restaurant: r1.id }), 'FORBIDDEN');
});

test('a guest can cancel a pending order, which releases the promo use', async () => {
  const other = { p_phone: '0770 111 22 33', p_items: [line(fries, [], 3)] };
  const res = ok(await anon.rpc('place_order', orderArgs({ ...other, p_promo: u.promoCode })));
  assert.equal(ok(await anon.rpc('track_order', { p_order: res.order_id, p_token: res.token })).discount, 600);
  ok(await anon.rpc('cancel_order', { p_order: res.order_id, p_token: res.token }));
  assert.equal(ok(await anon.rpc('track_order', { p_order: res.order_id, p_token: res.token })).status, 'cancelled');
  assert.equal(ok(await u.vendor1.from('promotions').select('used_count').eq('code', u.promoCode).single()).used_count, 1);
});

test('one phone number cannot pile up unconfirmed orders', async () => {
  const args = () => orderArgs({ p_phone: '0771 000 00 01', p_items: [line(fries, [], 2)] });
  const placed = [];
  for (let i = 0; i < 3; i++) placed.push(ok(await anon.rpc('place_order', args())));
  await rpcError(anon.rpc('place_order', args()), 'TOO_MANY_PENDING');
  for (const o of placed) ok(await anon.rpc('cancel_order', { p_order: o.order_id, p_token: o.token }));
  const again = ok(await anon.rpc('place_order', args()));
  ok(await anon.rpc('cancel_order', { p_order: again.order_id, p_token: again.token }));
});

test('unavailable, archived and closed states block ordering; minimum order applies', async () => {
  const order = (items) => anon.rpc('place_order', orderArgs({ p_phone: '0772 000 00 02', p_items: items }));
  await rpcError(order([line(fries)]), 'MIN_ORDER'); // 2000 < 3000

  ok(await u.vendor1.from('menu_items').update({ is_available: false }).eq('id', fries.id).select().single());
  await rpcError(order([line(fries, [], 2)]), 'ITEM_UNAVAILABLE');
  ok(await u.vendor1.from('menu_items').update({ is_available: true }).eq('id', fries.id).select().single());

  ok(await u.vendor1.from('restaurants').update({ status: 'closed' }).eq('id', r1.id).select().single());
  await rpcError(order([line(fries, [], 2)]), 'RESTAURANT_CLOSED');
  ok(await u.vendor1.from('restaurants').update({ status: 'open' }).eq('id', r1.id).select().single());

  // archive: hidden from the public, still visible to the owner, history intact
  ok(await u.vendor1.from('menu_items').update({ archived_at: new Date().toISOString() }).eq('id', burger.id).select().single());
  assert.deepEqual(ok(await anon.from('menu_items').select('id').eq('id', burger.id)), []);
  assert.equal(ok(await u.vendor1.from('menu_items').select('id').eq('id', burger.id)).length, 1);
  await rpcError(order([line(burger, [sizeLarge.id])]), 'ITEM_UNAVAILABLE');

  // even a hard delete keeps the order lines (snapshot + item_id set null)
  ok(await u.vendor1.from('menu_items').delete().eq('id', burger.id).select());
  const tracked = ok(await anon.rpc('track_order', { p_order: u.orderId, p_token: u.token }));
  assert.ok(tracked.order_items.some((i) => i.name_en === 'Beef Burger' && i.item_id === null));
});

test('inactive restaurants and their menus are hidden from the public', async () => {
  ok(await u.admin.from('restaurants').update({ is_active: false }).eq('id', r2.id).select().single());
  assert.deepEqual(ok(await anon.from('restaurants').select('id').eq('id', r2.id)), []);
  assert.deepEqual(ok(await anon.from('menu_items').select('id').eq('restaurant_id', r2.id)), []);
  assert.equal(ok(await u.vendor2.from('restaurants').select('id').eq('id', r2.id)).length, 1);
  await rpcError(anon.rpc('place_order', orderArgs({ p_phone: '0773 000 00 03', p_items: [line(otherItem)] })), 'ITEM_UNAVAILABLE');
  ok(await u.admin.from('restaurants').update({ is_active: true }).eq('id', r2.id).select().single());
});

test('demoted vendors lose access immediately', async () => {
  ok(await u.admin.from('profiles').update({ role: 'customer' }).eq('id', u.vendor2.id).select().single());
  denied(await u.vendor2.from('menu_items').update({ price: 1 }).eq('id', otherItem.id).select(), 'demoted vendor edits item');
  ok(await u.admin.from('profiles').update({ role: 'vendor' }).eq('id', u.vendor2.id).select().single());
});

test('managers add, update and remove staff logins; nobody else can', async () => {
  const email = `staff-${run}@test.local`;
  const make = (client, extra = {}) => client.rpc('admin_create_user', { p_email: email, p_password: 'first-pass-1', p_full_name: 'New Manager', ...extra });
  await rpcError(make(anon), 'permission denied for function admin_create_user');
  await rpcError(make(u.alice), 'FORBIDDEN');
  await rpcError(make(u.vendor1), 'FORBIDDEN');
  await rpcError(make(u.admin, { p_password: 'short' }), 'PASSWORD_INVALID');
  await rpcError(make(u.admin, { p_email: 'not-an-email' }), 'EMAIL_INVALID');

  const id = ok(await make(u.admin, { p_phone: '0750 000 00 00' }));
  await rpcError(make(u.admin, { p_email: email.toUpperCase() }), 'EMAIL_TAKEN');

  const staff = createClient(SUPABASE_URL, ANON_KEY, opts);
  ok(await staff.auth.signInWithPassword({ email, password: 'first-pass-1' }));
  assert.deepEqual(ok(await staff.from('profiles').select('full_name, phone, role').eq('id', id).single()), {
    full_name: 'New Manager', phone: '07500000000', role: 'admin',
  });

  await rpcError(u.alice.rpc('admin_update_user', { p_user: id, p_full_name: 'Hacked' }), 'FORBIDDEN');
  ok(await u.admin.rpc('admin_update_user', { p_user: id, p_full_name: 'Renamed', p_password: 'second-pass-2' }));
  assert.ok((await createClient(SUPABASE_URL, ANON_KEY, opts).auth.signInWithPassword({ email, password: 'first-pass-1' })).error);
  ok(await createClient(SUPABASE_URL, ANON_KEY, opts).auth.signInWithPassword({ email, password: 'second-pass-2' }));

  await rpcError(u.alice.rpc('admin_delete_user', { p_user: id }), 'FORBIDDEN');
  await rpcError(u.admin.rpc('admin_delete_user', { p_user: u.admin.id }), 'CANNOT_REMOVE_SELF');
  ok(await u.admin.rpc('admin_delete_user', { p_user: id }));
  assert.ok((await createClient(SUPABASE_URL, ANON_KEY, opts).auth.signInWithPassword({ email, password: 'second-pass-2' })).error);
});

test('storage policies scope uploads to the restaurant / user folder', () => {
  const as = (client, stmt) => {
    try {
      sql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${client.id}","role":"authenticated"}', true); ${stmt}; rollback;`);
      return true;
    } catch {
      return false;
    }
  };
  const put = (bucket, path) => `insert into storage.objects (bucket_id, name) values ('${bucket}', '${path}')`;
  assert.equal(as(u.vendor1, put('media', `${r1.id}/items/a.webp`)), true);
  assert.equal(as(u.vendor1, put('media', `${r2.id}/items/a.webp`)), false);
  assert.equal(as(u.alice, put('media', `${r1.id}/items/a.webp`)), false);
  assert.equal(as(u.alice, put('media', 'not-a-uuid/a.webp')), false);
  assert.equal(as(u.alice, put('avatars', `${u.alice.id}/me.webp`)), true);
  assert.equal(as(u.alice, put('avatars', `${u.bob.id}/me.webp`)), false);
  assert.equal(as(u.admin, put('media', `${r2.id}/cover.webp`)), true);
});

test('every public table has RLS enabled and internal functions are not callable', async () => {
  assert.equal(sql("select count(*) from pg_tables where schemaname = 'public' and not rowsecurity"), '0');
  for (const fn of ['apply_order_status', 'promo_discount', 'item_unit_price', 'cart_lines']) {
    for (const client of [anon, u.alice]) {
      const { error } = await client.rpc(fn, {});
      assert.ok(error, `${fn} must not be exposed`);
    }
  }
});
