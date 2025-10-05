'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Plus, X, Menu as MenuIcon } from 'lucide-react';
import Image from "next/image";

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
  main: 'Main Courses',
  drinks: 'Drinks',
  bbq: 'BBQ',
  sandwiches: 'Sandwiches',
};

const sectionNamesKurdish = {
  main: 'کۆرسە سەرەکیەکان',
  drinks: 'خواردنەوەکان',
  bbq: 'برژاو',
  shawrma: 'شاورمە',
  sandwiches: 'ساندوێچ',
};

const sectionNamesArabic = {
  main: 'الأطباق الرئيسية',
  bbq: 'الشواء',
  drinks: 'مشروبات',
  shawrma: 'شاورما',
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
  const [lang, setLang] = useState('ku-sor');
  const menuData = lang === 'en' ? en : lang === 'ar' ? ar : krd;
  const sectionNames =
    lang === 'en' ? sectionNamesEnglish : lang === 'ar' ? sectionNamesArabic : sectionNamesKurdish;
  const text =
    lang === 'en'
      ? 'Welcome to Kebab Pasha'
      : lang === 'ar'
        ? ' أهلاً بكم في كباب باشا'
        : ' بەخێربێیت بۆ کەباب پاشا';

  // customer info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('');
  const [comment, setComment] = useState('');

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
    if (!name || !phone || !building) {
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
      comment,
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
    setComment('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header
        id="kp-header"
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b-2 border-orange-200"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-3xl md:text-4xl font-black text-orange-600 tracking-tight">
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
                      'px-5 py-2.5 rounded-full font-semibold transition-all duration-300',
                      isActive
                        ? 'bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-orange-600 hover:text-white hover:shadow-md',
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
                className="relative px-5 py-2.5 bg-orange-600 text-white rounded-full font-semibold transition-all duration-300 hover:bg-orange-700 hover:scale-105 shadow-lg hover:shadow-xl"
                aria-label="Open cart"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={22} />
                  <span className="hidden sm:inline">Cart</span>
                </div>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <LanguageDropdown currentLang={lang} setLang={setLang} />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen((s) => !s)}
                className="md:hidden p-2.5 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-all"
                aria-label="Toggle menu"
              >
                <MenuIcon size={22} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-4 bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-100">
              <div className="grid grid-cols-2 gap-2">
                {sections.map((section) => {
                  const isActive = activeSection === section;
                  return (
                    <button
                      key={section}
                      onClick={() => scrollToSection(section)}
                      className={[
                        'p-3 rounded-xl text-center font-semibold transition-all',
                        isActive ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white',
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
              className="mb-16 bg-white/90 backdrop-blur-sm rounded-3xl p-8 md:p-10 shadow-2xl border-2 border-orange-100"
            >
              <h2
                className="text-4xl md:text-5xl font-black text-orange-600 text-center mb-6"
              >
                {sectionNames[sectionKey] || titleCase(sectionKey)}
              </h2>
              <div className="w-32 h-1.5 bg-orange-600 mx-auto mb-10 rounded-full" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-orange-100 hover:border-orange-300"
                  >
                    {/* Food Image - Fixed aspect ratio with proper overflow handling */}
                    <div className="relative w-full h-64 bg-gradient-to-br from-orange-100 to-amber-100 overflow-hidden">
                      <Image
                        src={`/images/${item.image}`}
                        alt={item.name || 'Food item'}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 mb-5 text-base leading-relaxed min-h-[3rem]">
                        {item.description || ''}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
                        <span className="text-3xl font-black text-orange-600">
                          {Number(item.price || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{' '}
                          IQD
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-xl flex items-center gap-2"
                        >
                          <Plus size={20} />
                          <span>Add</span>
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

      {/* Cart Modall */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-orange-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-orange-600">
                {/* Title is handled within children if needed */}
              </h2>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckout(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                aria-label="Close cart"
              >
                <X size={28} />
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
                phone={phone}
                name={name}
                building={building}
                setComment={setComment}
                comment={comment}
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