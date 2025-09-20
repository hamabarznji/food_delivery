import React, { useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';

const Checkout = ({
  cart,
  updateQuantity,
  getTotalPrice,
  handleCheckout,
  lang
}) => {
  const t = translations[lang] || translations.en;

  // RTL for Arabic and Sorani Kurdish
  const isRTL = lang === 'ar' || lang === 'krd';

  // Price formatter: show number + "IQD" (to match your menu cards)
  const formatIQD = (value) =>
    `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} IQD`;

  const items = useMemo(() => Object.values(cart || {}), [cart]);
  const isEmpty = items.length === 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {isEmpty ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-600">{t.empty}</h3>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map((item) => {
              const lineTotal = (item.price || 0) * (item.quantity || 0);
              const canDecrement = true
              return (
                <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 truncate max-w-[60%]">{item.name}</h4>
                    <span className="font-bold text-orange-600">
                      {formatIQD(lineTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {formatIQD(item.price)} {t.each}
                    </span>

                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-300 ${canDecrement ? '' : 'opacity-50 cursor-not-allowed'}`}
                        style={{ backgroundColor: '#E35711' }}
                        aria-label={t.decreaseQty}
                        disabled={!canDecrement}
                        type="button"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="font-semibold min-w-[2rem] text-center select-none">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        style={{ backgroundColor: '#E35711' }}
                        aria-label={t.increaseQty}
                        type="button"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-orange-600">
                {t.orderTotal}: {formatIQD(getTotalPrice())}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-4 text-white rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              style={{ background: 'linear-gradient(135deg, #E35711, #ff7a3d)' }}
              type="button"
              aria-label={t.checkout}
            >
              {t.checkout}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Checkout;

const translations = {
  en: {
    checkout: 'Proceed to Checkout',
    empty: 'Your cart is empty',
    each: 'Each',
    placeOrder: 'Place Order',
    orderTotal: 'Order Total',
    increaseQty: 'Increase quantity',
    decreaseQty: 'Decrease quantity',
  },
  ar: {
    checkout: 'المتابعة إلى الدفع',
    empty: 'سلة التسوق فارغة',
    each: 'لكل واحدة',
    placeOrder: 'تأكيد الطلب',
    orderTotal: 'إجمالي الطلب',
    increaseQty: 'زيادة الكمية',
    decreaseQty: 'إنقاص الكمية',
  },
  krd: {
    checkout: 'تەواوکردنی پارەدان',
    empty: 'سەڵەت بەتاڵە',
    each: 'هەریەک',
    placeOrder: 'داواکاری بنێرە',
    orderTotal: 'کۆی گشتی',
    increaseQty: 'زیادکردنی ژمارە',
    decreaseQty: 'کەمکردنەوەی ژمارە',
  },
};
