import React from 'react';
import { Plus, Minus } from 'lucide-react';

const Checkout = ({
    cart,
    updateQuantity,
    getTotalPrice,
    handleCheckout,
    lang


}) => {

  const t = translations[lang]; // get current language translations

    return <>{Object.keys(cart).length === 0 ? (
        <div className="text-center py-8">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-600">{t.empty}</h3>
            {/* <p className="text-gray-500">Add some delicious items to get started!</p> */}
        </div>
    ) : (
        <>
            <div className="space-y-4 mb-6">
                {Object.values(cart).map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{item.name}</h4>
                            <span className="font-bold" style={{ color: '#E35711' }}>
                                ${(item.price * item.quantity).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                ${item.price.toFixed(2)} {t.each}
                            </span>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                                    style={{ backgroundColor: '#E35711' }}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-semibold min-w-[2rem] text-center">
                                    {item.quantity}
                                </span>
                                <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                                    style={{ backgroundColor: '#E35711' }}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t pt-4">
                <div className="text-center mb-4">
                    <div className="text-2xl font-bold" style={{ color: '#E35711' }}>
                        {t.orderTotal}: ${getTotalPrice().toFixed(2)}
                    </div>
                </div>
                <button
                    onClick={handleCheckout}
                    className="w-full py-4 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #E35711, #ff7a3d)' }}
                >
                   {t.checkout}
                </button>
            </div>
        </>
    )}
    </>
}

export default Checkout

const translations = {
  en: {
    checkout: "Proceed to Checkout",
    empty: "Your cart is empty",
    each: "Each",
    placeOrder: "Place Order",
    orderTotal: "Order Total"
  },
  ar: {
    checkout: "المتابعة إلى الدفع",
    empty: "سلة التسوق فارغة",
    each: "لكل واحدة",
    placeOrder: "تأكيد الطلب",
    orderTotal: "إجمالي الطلب"
  },
  krd: {
    checkout: " تەواوکردنی داواکاری",
    empty: "سەڵەکەت بەتاڵە",
    each: "هەریەک",
    placeOrder: "داواکاری بنێرە",
    orderTotal: "کۆی گشتی",
  }
};
