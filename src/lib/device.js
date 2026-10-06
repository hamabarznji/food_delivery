'use client';

// Things a guest's browser remembers: the orders placed from it (id + tracking
// token, which is what lets them follow an order without an account) and the
// delivery details they last used.
const ORDERS_KEY = 'orders:v1';
const CUSTOMER_KEY = 'customer:v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode)
  }
};

export const isUuid = (value) => typeof value === 'string' && UUID.test(value);

export function savedOrders() {
  const list = read(ORDERS_KEY, []);
  return Array.isArray(list) ? list.filter((o) => isUuid(o?.id) && isUuid(o?.token)) : [];
}

export function rememberOrder(id, token) {
  if (!isUuid(id) || !isUuid(token)) return;
  write(ORDERS_KEY, [{ id, token }, ...savedOrders().filter((o) => o.id !== id)].slice(0, 30));
}

export const orderToken = (id) => savedOrders().find((o) => o.id === id)?.token || null;

export const savedCustomer = () => read(CUSTOMER_KEY, {}) || {};
export const rememberCustomer = (details) => write(CUSTOMER_KEY, details);
