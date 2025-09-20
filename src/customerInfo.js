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
  floor
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder="Enter your full name"
        />
      </div>

      <div>
  <label className="block text-sm font-semibold mb-2 text-gray-700">
    Phone Number
  </label>
  <input
    type="tel"
    required
    value={phone}
    onChange={(e) => {
      // Remove all non-digit characters
      let digits = e.target.value.replace(/\D/g, '');

      // Limit to exactly 11 digits
      digits = digits.slice(0, 11);

      // Format as 0XXX XXX XX XX
      let formatted = '';
      if (digits.length >= 1) formatted += digits.slice(0, 4); // 0XXX
      if (digits.length >= 4) formatted += ' ' + digits.slice(4, 7); // XXX
      if (digits.length >= 7) formatted += ' ' + digits.slice(7, 9); // XX
      if (digits.length >= 9) formatted += ' ' + digits.slice(9, 11); // XX

      setPhone(formatted.trim());
    }}
    pattern="0\d{3}\s\d{3}\s\d{2}\s\d{2}" // strict validation
    maxLength={14} // 11 digits + 3 spaces
    title="Phone number must be exactly 0XXX XXX XX XX"
    placeholder="0XXX XXX XX XX"
    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
  />
</div>


      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Building Number
        </label>
        <input
          type="text"
          required
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder="Enter building number"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Floor Number
        </label>
        <input
          type="text"
          required
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
          placeholder="Enter floor number"
        />
      </div>

      <div className="border-t pt-4 mt-6">
        <div className="text-center mb-4">
          <div className="text-xl font-bold" style={{ color: '#E35711' }}>
            Order Total: ${getTotalPrice().toFixed(2)}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Placing Order...</span>
            </div>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </form>
  );
};

export default CustomerInfoComponent;
