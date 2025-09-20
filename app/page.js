'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Menu as MenuIcon } from 'lucide-react';
import menuData from '@/public/menu';

const RestaurantApp = () => {
   const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('appetizers');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', building: '', floor: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

const sendToTelegram = async (orderDetails) => {
  try {
    const res = await fetch('/api/sendorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderDetails }),
    });

    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error('Error sending to Telegram:', err);
    return false;
  }
};




  const sectionNames = {
    appetizers: 'Appetizers',
    mains: 'Main Courses',
    desserts: 'Desserts',
    beverages: 'Beverages',
  };

  const addToCart = (item) => setCart(prev => {
    const existing = prev[item.id];
    return {
      ...prev,
      [item.id]: existing ? { ...existing, quantity: existing.quantity + 1 } : { ...item, quantity: 1 }
    };
  });

  const updateQuantity = (id, change) => setCart(prev => {
    const existing = prev[id];
    if (!existing) return prev;
    const newQty = existing.quantity + change;
    if (newQty <= 0) {
      const { [id]: _, ...rest } = prev;
      return rest;
    }
    return { ...prev, [id]: { ...existing, quantity: newQty } };
  });

  const getTotalItems = () => Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  const getTotalPrice = () => Object.values(cart).reduce((total, item) => total + item.price * item.quantity, 0);
  const handleCheckout = () => setIsCheckout(true);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.building || !customerInfo.floor) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);

    const orderItems = Object.values(cart).map(item => `• ${item.name} x${item.quantity} - $${(item.price*item.quantity).toFixed(2)}`).join('\n');
    const orderDetails = { ...customerInfo, items: orderItems, total: getTotalPrice().toFixed(2) };

    const success = await sendToTelegram(orderDetails);

    if (success) alert('Order sent successfully!');
    else alert('Order placed, but Telegram notification failed.');

    setCart({});
    setIsCartOpen(false);
    setIsCheckout(false);
    setCustomerInfo({ name: '', phone: '', building: '', floor: '' });
    setIsSubmitting(false);
  };

  const scrollToSection = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  };

  // Hero Component
  const Hero = () => (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-16 shadow-xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: '#E35711' }}>
          Welcome to Kebab Pasha
        </h1>
        <p className="text-lg md:text-xl text-gray-600">
          Experience authentic Middle Eastern flavors crafted with love and tradition
        </p>
      </div>
    </div>
  );

  // Checkout Component
  const Checkout = ({ cart, updateQuantity, getTotalPrice, handleCheckout }) => (
    <>
      {Object.keys(cart).length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-600">Your cart is empty</h3>
          <p className="text-gray-500">Add some delicious items to get started!</p>
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
                    ${item.price.toFixed(2)} each
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
                Total: ${getTotalPrice().toFixed(2)}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-4 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #E35711, #ff7a3d)' }}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </>
  );

  // Customer Info Component
  const CustomerInfoComponent = ({ isSubmitting, getTotalPrice, setCustomerInfo, customerInfo, onSubmit }) => (
    <div className="space-y-4">
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
          onClick={onSubmit}
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
            'Place Order'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E6E7B2', color: '#E35711' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl md:text-3xl font-bold" style={{ color: '#E35711' }}>
              Kebab Pasha
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              {Object.keys(sectionNames).map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${activeSection === section
                      ? 'text-white shadow-lg'
                      : 'text-gray-600 hover:text-white'
                    }`}
                  style={{
                    backgroundColor: activeSection === section ? '#E35711' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section) {
                      e.target.style.backgroundColor = '#E35711';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#666';
                    }
                  }}
                >
                  {sectionNames[section]}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative px-4 py-2 text-white rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#E35711' }}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart size={20} />
                  <span className="hidden sm:inline">Cart</span>
                </div>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-white rounded-full"
                style={{ backgroundColor: '#E35711' }}
              >
                <MenuIcon size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 bg-white rounded-lg shadow-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(sectionNames).map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className={`p-3 rounded-lg text-center transition-all duration-300 ${activeSection === section ? 'text-white' : 'text-gray-600'
                      }`}
                    style={{
                      backgroundColor: activeSection === section ? '#E35711' : '#f3f4f6'
                    }}
                  >
                    {sectionNames[section]}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <Hero />

      {/* Menu Sections */}
      <div className="container mx-auto px-4 pb-16">
        {Object.entries(menuData).map(([sectionKey, items]) => (
          <section
            key={sectionKey}
            className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8" style={{ color: '#E35711' }}>
              {sectionNames[sectionKey]}
              <div className="w-24 h-1 mx-auto mt-4 rounded-full" style={{ backgroundColor: '#E35711' }}></div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-orange-200"
                >
                  {/* Food Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/400x300/E6E7B2/E35711?text=${encodeURIComponent(item.name)}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#333' }}>
                      {item.name}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold" style={{ color: '#E35711' }}>
                        ${item.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="px-4 py-2 bg-gradient-to-r text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center space-x-1"
                        style={{ background: 'linear-gradient(135deg, #E35711, #ff7a3d)' }}
                      >
                        <Plus size={16} />
                        <span className="text-sm font-medium">Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#E35711' }}>
                {isCheckout ? 'Customer Information' : 'Your Cart'}
              </h2>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckout(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {!isCheckout ? (
              <Checkout
                cart={cart}
                updateQuantity={updateQuantity}
                getTotalPrice={getTotalPrice}
                handleCheckout={handleCheckout}
              />
            ) : (
              <CustomerInfoComponent
                isSubmitting={isSubmitting}
                getTotalPrice={getTotalPrice}
                setCustomerInfo={setCustomerInfo}
                customerInfo={customerInfo}
                onSubmit={handleOrderSubmit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantApp;


