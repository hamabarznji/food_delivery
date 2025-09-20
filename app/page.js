'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Plus, X, Menu as MenuIcon } from 'lucide-react';

// data bundles
import ar from '@/public/ar';
import en from '@/public/en';
import krd from '@/public/ku-sor';

// sections
import CustomerInfoComponent from '@/src/customerInfo';
import HeroComponent from '@/src/HeroSection';
import Checkout from '@/src/checkout';
import LanguageDropdown from '@/src/lang';

// ---- Section labels (keep keys consistent: mains, bbq, drinks, shawrma, desserts, sandwiches, etc.)
const sectionNamesEnglish = {
  shawrma: 'Shawrma',
  mains: 'Main Courses',
  desserts: 'Desserts',
  drinks: 'Drinks',
  bbq: 'BBQ',
  sandwiches: 'Sandwiches',
};

const sectionNamesKurdish = {
  mains: 'کۆرسە سەرەکیەکان',
  drinks: 'خواردنەوەکان',
  bbq: 'برژاو',
  shawrma: 'شاورمە',
  desserts: 'شیرینی',
  sandwiches: 'ساندوێچ',
};

const sectionNamesArabic = {
  mains: 'الأطباق الرئيسية',
  bbq: 'الشواء',
  drinks: 'مشروبات',
  shawrma: 'شاورما',
  desserts: 'حلويات',
  sandwiches: 'ساندوتشات',
};

function titleCase(key) {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(s) {
  return String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const RestaurantApp = () => {
  // cart / checkout
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // language
  const [lang, setLang] = useState('en');
  const menuData = lang === 'en' ? en : lang === 'ar' ? ar : krd;
  const sectionNames =
    lang === 'en' ? sectionNamesEnglish : lang === 'ar' ? sectionNamesArabic : sectionNamesKurdish;
  const text =
    lang === 'en'
      ? 'Welcome to Kebab Pasha'
      : lang === 'ar'
      ? ' أهلاً بكم في كباب باشا!'
      : ' بەخێربێیت بۆ کەباب پاشا';

  // customer info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');

  // --- derived: list of sections from data (always trust data keys)
  const sections = useMemo(() => Object.keys(menuData || {}), [menuData]);

  // map of section ids -> ref
  const sectionRefs = useRef({});
  sections.forEach((key) => {
    const id = `sec-${slugify(key)}`;
    if (!sectionRefs.current[id]) sectionRefs.current[id] = React.createRef();
  });

  // ensure an initial active section
  useEffect(() => {
    if (sections.length && !activeSection) setActiveSection(sections[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // ----- Smooth scroll with sticky header offset
  const scrollToSection = (sectionKey) => {
    const id = `sec-${slugify(sectionKey)}`;
    const node = sectionRefs.current[id]?.current;
    if (!node) return;

    const header = document.getElementById('kp-header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    const y = node.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 12);
    window.scrollTo({ top: y, behavior: 'smooth' });

    setActiveSection(sectionKey);
    setIsMobileMenuOpen(false);
  };

  // ----- ScrollSpy (highlights active tab while scrolling)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // choose the entry most in-view near the top
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible?.target?.id) {
          const key = visible.target.getAttribute('data-key');
          if (key && key !== activeSection) setActiveSection(key);
        }
      },
      {
        rootMargin: '-64px 0px -70% 0px', // bias to the section near the top under sticky header
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((k) => {
      const id = `sec-${slugify(k)}`;
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, activeSection]);

  // --- API
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

  // --- cart ops
  const addToCart = (item) =>
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: existing ? { ...existing, quantity: existing.quantity + 1 } : { ...item, quantity: 1 },
      };
    });

  const updateQuantity = (id, change) =>
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const newQty = existing.quantity + change;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...existing, quantity: newQty } };
    });

  const getTotalItems = () => Object.values(cart).reduce((t, i) => t + i.quantity, 0);
  const getTotalPrice = () => Object.values(cart).reduce((t, i) => t + i.price * i.quantity, 0);
  const handleCheckout = () => setIsCheckout(true);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !building ) {
      alert('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);

    const orderItems = Object.values(cart)
      .map((item) => `• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    const orderDetails = {
      name,
      phone,
      building,
      floor,
      items: orderItems,
      total: getTotalPrice().toFixed(2),
    };

    const success = await sendToTelegram(orderDetails);

    if (success) console.log('Order sent successfully!');
    else console.log('Order placed, but Telegram notification failed.');

    setCart({});
    setIsCartOpen(false);
    setIsCheckout(false);
    setName('');
    setPhone('');
    setBuilding('');
    setFloor('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E6E7B2', color: '#E35711' }}>
      {/* Header */}
      <header
        id="kp-header"
        className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-lg border-b border-orange-100"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-2xl md:text-3xl font-bold" style={{ color: '#E35711' }}>
              Kebab Pasha
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-2">
              {sections.map((section) => {
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className={[
                      'px-4 py-2 rounded-full transition-all duration-200',
                      'hover:scale-105',
                      isActive
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-transparent text-gray-700 hover:bg-orange-600 hover:text-white',
                    ].join(' ')}
                  >
                    {sectionNames[section] || titleCase(section)}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative px-4 py-2 text-white rounded-full transition-all duration-200 hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#E35711' }}
                aria-label="Open cart"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={20} />
                  <span className="hidden sm:inline">Cart</span>
                </div>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <LanguageDropdown currentLang={lang} setLang={setLang} />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen((s) => !s)}
                className="md:hidden p-2 text-white rounded-full"
                style={{ backgroundColor: '#E35711' }}
                aria-label="Toggle menu"
              >
                <MenuIcon size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-3 bg-white rounded-lg shadow-lg p-3 border border-orange-100">
              <div className="grid grid-cols-2 gap-2">
                {sections.map((section) => {
                  const isActive = activeSection === section;
                  return (
                    <button
                      key={section}
                      onClick={() => scrollToSection(section)}
                      className={[
                        'p-3 rounded-lg text-center transition-all duration-200',
                        isActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-orange-600 hover:text-white',
                      ].join(' ')}
                    >
                      {sectionNames[section] || titleCase(section)}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero */}
      <HeroComponent text={text} />

      {/* Menu Sections */}
      <div className="container mx-auto px-4 pb-16">
        {sections.map((sectionKey) => {
          const id = `sec-${slugify(sectionKey)}`;
          const items = menuData[sectionKey] || [];
          return (
            <section
              key={sectionKey}
              id={id}
              data-key={sectionKey}
              ref={sectionRefs.current[`sec-${slugify(sectionKey)}`]}
              className="mb-16 bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-xl border border-orange-100"
            >
              <h2
                className="text-3xl md:text-4xl font-bold text-center mb-8"
                style={{ color: '#E35711' }}
              >
                {sectionNames[sectionKey] || titleCase(sectionKey)}
                <div
                  className="w-24 h-1 mx-auto mt-4 rounded-full"
                  style={{ backgroundColor: '#E35711' }}
                />
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl border-2 border-transparent hover:border-orange-200"
                  >
                    {/* Food Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x300/E6E7B2/E35711?text=${encodeURIComponent(
                            item.name || 'Item'
                          )}`;
                        }}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{item.name}</h3>
                      <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold" style={{ color: '#E35711' }}>
                          {Number(item.price || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{' '}
                          IQD
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="px-4 py-2 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-1"
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
          );
        })}
      </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#E35711' }}>
                {/* Title is handled within children if needed */}
              </h2>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckout(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close cart"
              >
                <X size={24} />
              </button>
            </div>

            {/* Keep both mounted, only toggle visibility */}
            <div style={{ display: isCheckout ? 'none' : 'block' }}>
              <Checkout
                cart={cart}
                updateQuantity={updateQuantity}
                getTotalPrice={getTotalPrice}
                handleCheckout={handleCheckout}
                lang={lang}
              />
            </div>

            <div style={{ display: isCheckout ? 'block' : 'none' }}>
              <CustomerInfoComponent
                isSubmitting={isSubmitting}
                getTotalPrice={getTotalPrice}
                onSubmit={handleOrderSubmit}
                setName={setName}
                setPhone={setPhone}
                setBuilding={setBuilding}
                setFloor={setFloor}
                phone={phone}
                name={name}
                building={building}
                floor={floor}
                lang={lang}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantApp;
