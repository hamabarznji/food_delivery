const translations = { en: { fullName: "Full Name", phoneNumber: "Phone Number", buildingNumber: "Building Number", floorNumber: "Floor Number", placeOrder: "Place Order", orderTotal: "Order Total" }, ar: { fullName: "الاسم الكامل", phoneNumber: "رقم الهاتف", buildingNumber: "رقم المبنى", floorNumber: "رقم الطابق", placeOrder: "تأكيد الطلب", orderTotal: "إجمالي الطلب" }, krd: { fullName: "ناوی تەواو", phoneNumber: "ژمارەی مۆبایل", buildingNumber: "ژمارەی باڵەخانە", floorNumber: "ژمارەی نهۆم", placeOrder: "داواکاری بنێرە", orderTotal: "کۆی گشتی داواکاری" } };
const CustomerInfoComponent = ({
  onSubmit,
  getTotalPrice,
  isSubmitting,
  setName,
  setPhone,
  setBuilding,
  setFloor,
  phone,
  name,
  building,
  floor,
  lang = 'en'
}) => {
  const t = translations[lang]; // get current language translations
 const formatIQD = (value) =>
    `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} IQD`;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.fullName}
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder={t.fullName}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.phoneNumber}
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => {
            let digits = e.target.value.replace(/\D/g, '');
            digits = digits.slice(0, 11);

            let formatted = '';
            if (digits.length >= 1) formatted += digits.slice(0, 4);
            if (digits.length >= 4) formatted += ' ' + digits.slice(4, 7);
            if (digits.length >= 7) formatted += ' ' + digits.slice(7, 9);
            if (digits.length >= 9) formatted += ' ' + digits.slice(9, 11);

            setPhone(formatted.trim());
          }}
          pattern="0\d{3}\s\d{3}\s\d{2}\s\d{2}"
          maxLength={14}
          title="Phone number must be exactly 0XXX XXX XX XX"
          placeholder="0XXX XXX XX XX"
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.buildingNumber}
        </label>
        <input
          type="text"
          required
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder={t.buildingNumber}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.floorNumber}
        </label>
        <input
          type="text"
          required
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder={t.floorNumber}
        />
      </div>

      <div className="border-t pt-4 mt-6">
        <div className="text-center mb-4">
          <div className="text-xl font-bold" style={{ color: '#E35711' }}>
            {t.orderTotal}: {formatIQD(getTotalPrice())}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Placing Order...</span>
            </div>
          ) : (
            t.placeOrder
          )}
        </button>
      </div>
    </form>
  );
};

export default CustomerInfoComponent;
