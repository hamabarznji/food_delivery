const translations = {
  en: {
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    buildingNumber: "Building",
    comment: "Comment",
    placeOrder: "Place Order",
    orderTotal: "Order Total"
  },
  ar: {
    fullName: "الاسم الكامل",
    phoneNumber: "رقم الهاتف",
    buildingNumber: "رقم المبنى",
    comment: "ملاحظة",
    placeOrder: "تأكيد الطلب",
    orderTotal: "إجمالي الطلب"
  },
  krd: {
    fullName: "ناوی تەواو",
    phoneNumber: "ژمارەی مۆبایل",
    buildingNumber: "باڵەخانە",
    comment: "تێبینی",
    placeOrder: "داواکاری بنێرە",
    orderTotal: "کۆی گشتی داواکاری"
  }
};

const buildings = [
  { id: 1, en: "Law + Engineering Building", ar: "بناء قانون + هندسة", ku: "باڵەخانەی یاسا + ئەندازیاری" },
  { id: 2, en: "Dentistry Building", ar: "بناء طب الأسنان", ku: "باڵەخانەی ددان سازی" },
  { id: 3, en: "Pharmacy Building", ar: "بناء صيدلية", ku: "باڵەخانەی دەرمانسازی" },
  { id: 4, en: "Technical Building", ar: "بناء تقني", ku: "باڵەخانەی تەکنیکی" },
  { id: 5, en: "Accounts + Registration + Media", ar: "بناء حسابات + تسجيل + إعلام", ku: "باڵەخانەی ژمێریاری + تۆمار + ڕاگەیاندن" },
  { id: 6, en: "University Presidency", ar: "بناء رئاسة جامعية", ku: "باڵەخانەی سەرۆکایەتی زانکۆ" },
  { id: 7, en: "Dormitory", ar: "قسم داخلي", ku: "بەشی ناوخۆیی" },
  { id: 8, en: "Dormitory inside Garage", ar: "قسم داخلي داخل كراج", ku: "بەشی ناوخۆیی ناو گەراج" }
];

const CustomerInfoComponent = ({
  onSubmit,
  getTotalPrice,
  isSubmitting,
  setName,
  setPhone,
  setBuilding,
  setComment,     // ✅ new
  phone,
  name,
  building,
  comment,        // ✅ newww
  lang = "en"
}) => {
  const t = translations[lang] || translations.en;

  // Always "12,345 IQD"
  const formatIQD = (value) => `${Number(value || 0).toLocaleString("en-US")} IQD`;

  // Helper to render localized building label (supports en, ar, krd)
  const buildingLabel = (b) => (lang === "en" ? b.en : lang === "ar" ? b.ar : b.ku);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Full name */}
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
          autoComplete="name"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.phoneNumber}
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => {
            let digits = e.target.value.replace(/\D/g, "").slice(0, 11);
            let formatted = "";
            if (digits.length >= 1) formatted += digits.slice(0, 4);
            if (digits.length >= 4) formatted += " " + digits.slice(4, 7);
            if (digits.length >= 7) formatted += " " + digits.slice(7, 9);
            if (digits.length >= 9) formatted += " " + digits.slice(9, 11);
            setPhone(formatted.trim());
          }}
          pattern="0\d{3}\s\d{3}\s\d{2}\s\d{2}"
          maxLength={14}
          title="Phone number must be exactly 0XXX XXX XX XX"
          placeholder="0XXX XXX XX XX"
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          inputMode="numeric"
          dir="ltr"
        />
      </div>

      {/* Building (dropdown) */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.buildingNumber}
        </label>
        <select
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          required
        >
          <option value="" disabled>
            {t.buildingNumber}
          </option>
          {buildings.map((b) => (
            <option key={b.id} value={buildingLabel(b)}>
              {buildingLabel(b)}
            </option>
          ))}
        </select>
      </div>

      {/* Comment (textarea) */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {t.comment}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors resize-none"
          placeholder={t.comment}
          rows={3}
        />
      </div>

      {/* Total + submit */}
      <div className="border-t pt-4 mt-6">
        <div className="text-center mb-4">
          <div className="text-xl font-bold text-[#E35711]">
            {t.orderTotal}: {formatIQD(getTotalPrice())}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
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
