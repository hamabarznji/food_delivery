const CustomerInfoComponent=({

    handleOrderSubmit,
    setCustomerInfo,
    customerInfo,
    getTotalPrice,
    isSubmitting
})=>{



    return <> <div onSubmit={handleOrderSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
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
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Building Number
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.building}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, building: e.target.value }))}
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
                    value={customerInfo.floor}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, floor: e.target.value }))}
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
                    onClick={handleOrderSubmit}
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
              </div></>
}

export default CustomerInfoComponent