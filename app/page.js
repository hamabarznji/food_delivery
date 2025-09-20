'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Menu as MenuIcon } from 'lucide-react';
import menuData from '@/public/menu';
import Checkout from '@/src/checkout';
import CustomerInfoComponent from '@/src/customerInfo'
import Hero from '@/src/HeroSection'

const RestaurantApp = () => {
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('appetizers');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    building: '',
    floor: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Telegram Bot Configuration
  const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Replace with your bot token
  const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE'; // Replace with your chat ID

  const sendToTelegram = async (orderDetails) => {
    try {
      const message = `🍽️ *NEW ORDER RECEIVED*\n\n` +
        `👤 *Customer:* ${orderDetails.customerName}\n` +
        `📱 *Phone:* ${orderDetails.phone}\n` +
        `🏢 *Building:* ${orderDetails.building}\n` +
        `🏠 *Floor:* ${orderDetails.floor}\n\n` +
        `📋 *Order Items:*\n${orderDetails.items}\n\n` +
        `💰 *Total Amount:* ${orderDetails.total}\n\n` +
        `⏰ *Order Time:* ${new Date().toLocaleString()}`;

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to Telegram');
      }

      return true;
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      return false;
    }
  };



  const sectionNames = {
    appetizers: 'Appetizers',
    mains: 'Main Courses',
    desserts: 'Desserts',
    beverages: 'Beverages'
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : { ...item, quantity: 1 }
      };
    });
  };

  const updateQuantity = (id, change) => {
    setCart(prev => {
      const existing = prev[id];
      if (!existing) return prev;

      const newQty = existing.quantity + change;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev; // remove item immutably
        return rest;
      }

      return {
        ...prev,
        [id]: { ...existing, quantity: newQty }
      };
    });
  };


  const getTotalItems = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return Object.values(cart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    setIsCheckout(true);
  };

  const handleOrderSubmit = () => {
    // Basic validation
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.building || !customerInfo.floor) {
      alert('Please fill in all fields');
      return;
    }

    const total = getTotalPrice();

    alert(`Order placed successfully!\n\nCustomer: ${customerInfo.name}\nPhone: ${customerInfo.phone}\nAddress: Building ${customerInfo.building}, Floor ${customerInfo.floor}\nTotal: ${total.toFixed(2)}\n\nThank you for your order!`);

    setCart({});
    setIsCartOpen(false);
    setIsCheckout(false);
    setCustomerInfo({ name: '', phone: '', building: '', floor: '' });
  };

  const scrollToSection = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    // In a real Next.js app, you'd use refs or scroll behavior
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E6E7B2', color: '#E35711' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl md:text-3xl font-bold" style={{ color: '#E35711' }}>
              Delicious Bites
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
                    ':hover': { backgroundColor: '#E35711' }
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
   <Hero/>

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



              <Checkout cart={cart} updateQuantity={updateQuantity} getTotalPrice={getTotalPrice} handleCheckout={handleCheckout} />


            ) : (
              <CustomerInfoComponent isSubmitting={isSubmitting} getTotalPrice={getTotalPrice} setCustomerInfo={setCustomerInfo} customerInfo={customerInfo} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantApp;