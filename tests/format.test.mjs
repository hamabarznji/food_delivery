import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cartTotals, formatIQD, formatPhone, isRestaurantOpen, isValidPhone, loc, safeNext, slugify, unitPrice,
} from '../src/lib/format.js';
import { dictionaries, translate } from '../src/i18n/dict.js';

test('money and phone formatting', () => {
  assert.equal(formatIQD(12345), '12,345 IQD');
  assert.equal(formatIQD(null), '0 IQD');
  assert.equal(formatPhone('07504489892'), '0750 448 98 92');
  assert.equal(formatPhone('0750-44'), '0750 44');
  assert.equal(isValidPhone('0750 448 98 92'), true);
  assert.equal(isValidPhone('750 448 98 92'), false);
});

test('localised fields fall back sensibly', () => {
  const row = { name_en: 'Kebab', name_ku: 'کەباب', name_ar: null };
  assert.equal(loc(row, 'name', 'ku'), 'کەباب');
  assert.equal(loc(row, 'name', 'ar'), 'Kebab');
  assert.equal(loc(null, 'name', 'en'), '');
});

test('cart totals: subtotal, delivery, capped discount, minimum', () => {
  const lines = [
    { unitPrice: unitPrice({ price: 5000 }, [{ price_delta: 1000 }]), quantity: 2 },
    { unitPrice: 2000, quantity: 1 },
  ];
  const restaurant = { delivery_fee: 1000, min_order: 20000 };
  assert.deepEqual(cartTotals(lines, restaurant, 3000), {
    subtotal: 14000, deliveryFee: 1000, discount: 3000, total: 12000, count: 3, belowMinimum: true,
  });
  assert.equal(cartTotals(lines, restaurant, 999999).total, 1000); // discount never exceeds the subtotal
  assert.deepEqual(cartTotals([], restaurant), { subtotal: 0, deliveryFee: 0, discount: 0, total: 0, count: 0, belowMinimum: false });
});

test('opening hours use campus time and handle overnight ranges', () => {
  const at = (hhmm) => new Date(`2026-01-15T${hhmm}:00+03:00`);
  const day = { status: 'open', opens_at: '09:00:00', closes_at: '22:00:00' };
  assert.equal(isRestaurantOpen(day, at('12:00')), true);
  assert.equal(isRestaurantOpen(day, at('08:59')), false);
  assert.equal(isRestaurantOpen(day, at('22:00')), false);
  const night = { status: 'busy', opens_at: '18:00:00', closes_at: '02:00:00' };
  assert.equal(isRestaurantOpen(night, at('01:30')), true);
  assert.equal(isRestaurantOpen(night, at('03:00')), false);
  assert.equal(isRestaurantOpen({ ...day, status: 'closed' }, at('12:00')), false);
  assert.equal(isRestaurantOpen({ status: 'open' }, at('04:00')), true);
  assert.equal(isRestaurantOpen({ ...day, is_active: false }, at('12:00')), false);
});

test('redirect targets and slugs are sanitised', () => {
  assert.equal(safeNext('/checkout'), '/checkout');
  assert.equal(safeNext('//evil.example'), '/');
  assert.equal(safeNext('https://evil.example'), '/');
  assert.equal(safeNext('/\\evil.example'), '/');
  assert.equal(safeNext(undefined, '/x'), '/x');
  assert.equal(slugify(' Pasha  Restaurant! '), 'pasha-restaurant');
});

test('every language defines every UI string', () => {
  const keys = Object.keys(dictionaries.en);
  for (const lang of ['ku', 'ar']) {
    const allowed = new Set(['error.setupTitle', 'error.setupBody']); // developer-facing
    const missing = keys.filter((k) => !(k in dictionaries[lang]) && !allowed.has(k));
    const extra = Object.keys(dictionaries[lang]).filter((k) => !(k in dictionaries.en));
    assert.deepEqual(missing, [], `${lang} is missing keys`);
    assert.deepEqual(extra, [], `${lang} has unknown keys`);
  }
  assert.equal(translate('en', 'orders.order', { n: 1001 }), 'Order #1001');
  assert.equal(translate('ku', 'no.such.key'), 'no.such.key');
});
