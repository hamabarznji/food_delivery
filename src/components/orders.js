'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n, useToast } from './providers';
import { useCart } from './cart';
import { Button } from './ui';

// "Order again": puts the items of a past order back in the cart. Chosen
// options are not replayed (they may have changed); anything that is no longer
// on the menu shows up in the cart as unavailable.
export function ReorderButton({ order, variant = 'secondary', size = 'sm', block }) {
  const { t } = useI18n();
  const { replaceWith, openCart } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const reorder = async () => {
    const lines = order.order_items
      .filter((i) => i.item_id)
      .map((i) => ({ itemId: i.item_id, optionIds: [], quantity: Math.min(50, i.quantity) }));
    if (lines.length === 0) return toast.error(t('orders.reorderNone'));
    setBusy(true);
    await replaceWith(lines);
    setBusy(false);
    if (lines.length < order.order_items.length) toast.info(t('orders.reorderPartial'));
    else toast.success(t('orders.reordered'));
    openCart();
  };

  return (
    <Button variant={variant} size={size} block={block} onClick={reorder} loading={busy}>
      {!busy && <RotateCcw size={16} aria-hidden />}
      {t('orders.reorder')}
    </Button>
  );
}
