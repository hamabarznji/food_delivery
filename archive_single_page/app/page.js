'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Plus, X, Menu as MenuIcon, Shield, CheckCircle } from 'lucide-react';
import Image from "next/image";

// data bundles
import defaultAr from '@/public/ar';
import defaultEn from '@/public/en';
import defaultKrd from '@/public/ku-sor';

// sections & components
import CustomerInfoComponent from '@/src/customerInfo';
import HeroComponent from '@/src/HeroSection';
import Checkout from '@/src/checkout';
import LanguageDropdown from '@/src/lang';
import AdminModal from '@/src/adminModal';

const sectionNamesEnglish = {
  grills: 'Grills',
  'chicken-wings': 'Chicken Wings',
  shawarma: 'Shawarma',
  'chicken-burger': 'Chicken Burger',
  rizo: 'Rizo',
  finger: 'Finger',
  'beef-burger': 'Beef Burger',
};

const sectionNamesKurdish = {
  grills: 'برژاو',
  'chicken-wings': 'باڵی مریشک',
  shawarma: 'شاورمە',
  'chicken-burger': 'بەرگری مریشک',
  rizo: 'ڕیزۆ',
  finger: 'فینگەر',
  'beef-burger': 'بەرگری گۆشت',
};

const sectionNamesArabic = {
  grills: 'مشويات',
  'chicken-wings': 'اجنحة دجاج',
  shawarma: 'شاورما',
  'chicken-burger': 'بركر دجاج',
  rizo: 'ريزو',
  finger: 'فينكر',
  'beef-burger': 'بركر لحم',
};

const categoryNotesEnglish = {
  rizo: 'Sauce: Honey Mustard + Classic BBQ',
};

const categoryNotesArabic = {
  rizo: 'صوص (هاني ماستر + باربيكيو كلاسيك)',
};

const categoryNotesKurdish = {
  rizo: 'سۆس (هانی ماستەرد + باربیکیۆ کلاسیک)',
};

function titleCase(key) {
  return String(key).replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(s) {
  return String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const RestaurantApp = () => {
  // Global Menu state (loaded from API or fallback)
  const [allMenus, setAllMenus] = useState({
    en: defaultEn,
    ar: defaultAr,
    krd: defaultKrd,
  });

  // Load latest menu from API
  useEffect(() => {
    fetch('/api/menu')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setAllMenus(res.data);
        }
      })
      .catch((err) => console.log('Using default local menus:', err));
  }, []);

  // cart / checkout
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // admin modal
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // language
  const [lang, setLang] = useState('krd');
  const currentLangKey = lang === 'en' ? 'en' : lang === 'ar' ? 'ar' : 'krd';
  const menuData = allMenus[currentLangKey] || allMenus.krd || defaultKrd;

  const sectionNames =
    lang === 'en' ? sectionNamesEnglish : lang === 'ar' ? sectionNamesArabic : sectionNamesKurdish;
  const categoryNotes =
    lang === 'en' ? categoryNotesEnglish : lang === 'ar' ? categoryNotesArabic : categoryNotesKurdish;

  const restaurantName =
    lang === 'en'
      ? 'Pasha Restaurant'
      : lang === 'ar'
        ? 'مطعم باشا'
        : 'چێشتخانەی پاشا';

  const text =
    lang === 'en'
      ? 'Welcome to Pasha Restaurant'
      : lang === 'ar'
        ? 'أهلاً بكم في مطعم باشا'
        : 'بەخێربێیت بۆ چێشتخانەی پاشا';

  // customer info (The old way)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('');
  const [comment, setComment] = useState('');

  // derived: list of sections
  const sections = useMemo(() => Object.keys(menuData || {}), [menuData]);

  // map of section ids -> ref
  const sectionRefs = useRef({});
  sections.forEach((key) => {
    const id = `sec-${slugify(key)}`;
    if (!sectionRefs.current[id]) sectionRefs.current[id] = React.createRef();
  });

  useEffect(() => {
    if (sections.length && !activeSection) setActiveSection(sections[0]);
  }, [sections]);

  // Smooth scroll
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

  // ScrollSpy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible?.target?.id) {
          const key = visible.target.getAttribute('data-key');
          if (key && key !== activeSection) setActiveSection(key);
        }
      },
      {
        rootMargin: '-64px 0px -70% 0px',
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

  // API Order submit (Send to Telegram)
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

  // cart ops
  const addToCart = (item) => {
    if (item.is_sold_out) return;
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: existing ? { ...existing, quantity: existing.quantity + 1 } : { ...item, quantity: 1 },
      };
    });
  };

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

  // Customer order submission (The old way)
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !building) {
      alert(lang === 'en' ? 'Please fill in all fields' : lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'تکایە هەموو خانەکان پڕبکەرەوە');
      return;
    }
    setIsSubmitting(true);

    const orderItems = Object.values(cart)
      .map((item) => `• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(0)} IQD`)
      .join('\n');

    const orderDetails = {
      name,
      phone,
      building,
      comment,
      items: orderItems,
      total: getTotalPrice().toFixed(0),
    };

    const success = await sendToTelegram(orderDetails);
    if (success) {
      console.log('Order sent to Telegram successfully!');
    } else {
      console.log('Telegram delivery logged.');
    }

    setOrderSuccess(true);
    setCart({});
    setIsSubmitting(false);
  };

  const closeCartModal = () => {
    setIsCartOpen(false);
    setIsCheckout(false);
    setOrderSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 text-gray-900" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Header */}
      <header
        id="kp-header"
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-lg border-b-2 border-orange-200"
      >
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                {restaurantName}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1.5 lg:gap-2">
              {sections.map((section) => {
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className={[
                      'px-4 py-2 rounded-full font-bold text-sm transition-all duration-300',
                      isActive
                        ? 'bg-orange-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 hover:bg-orange-600 hover:text-white hover:shadow-sm',
                    ].join(' ')}
                  >
                    {sectionNames[section] || titleCase(section)}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Admin Menu Update Button (Login Required) */}
              <button
                onClick={() => setIsAdminOpen(true)}
                className="p-2 sm:px-3 sm:py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center gap-1.5 transition-all shadow-sm"
                title={lang === 'en' ? 'Menu Update (Staff Login)' : 'دەستکاریکردنی مێنۆ (ستاف)'}
              >
                <Shield size={18} className="text-orange-600" />
                <span className="hidden lg:inline">
                  {lang === 'en' ? 'Staff Login' : lang === 'ar' ? 'دخول الإدارة' : 'ستاف'}
                </span>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative px-4 py-2 sm:px-5 sm:py-2.5 bg-orange-600 text-white rounded-full font-semibold transition-all duration-300 hover:bg-orange-700 hover:scale-105 shadow-md flex items-center gap-2"
                aria-label="Open cart"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:inline">
                  {lang === 'en' ? 'Cart' : lang === 'ar' ? 'السلة' : 'سەڵەت'}
                </span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-bold shadow-md">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              {/* Language Switcher */}
              <LanguageDropdown currentLang={lang} setLang={setLang} />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen((s) => !s)}
                className="md:hidden p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-all"
                aria-label="Toggle menu"
              >
                <MenuIcon size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden mt-3 bg-white rounded-2xl shadow-xl p-3 border-2 border-orange-100">
              <div className="grid grid-cols-2 gap-2">
                {sections.map((section) => {
                  const isActive = activeSection === section;
                  return (
                    <button
                      key={section}
                      onClick={() => scrollToSection(section)}
                      className={[
                        'p-2.5 rounded-xl text-center font-bold text-xs transition-all',
                        isActive
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-orange-600 hover:text-white',
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
      <main className="container mx-auto px-4 pb-16">
        {sections.map((sectionKey) => {
          const id = `sec-${slugify(sectionKey)}`;
          const items = menuData[sectionKey] || [];
          return (
            <section
              key={sectionKey}
              id={id}
              data-key={sectionKey}
              ref={sectionRefs.current[`sec-${slugify(sectionKey)}`]}
              className="mb-14 bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-10 shadow-xl border-2 border-orange-100"
            >
              <h2 className="text-3xl md:text-5xl font-black text-orange-600 text-center mb-2">
                {sectionNames[sectionKey] || titleCase(sectionKey)}
              </h2>
              {categoryNotes[sectionKey] && (
                <p className="text-center text-gray-600 text-sm md:text-base mb-4 font-medium">
                  {categoryNotes[sectionKey]}
                </p>
              )}
              <div className="w-24 h-1.5 bg-orange-600 mx-auto mb-8 rounded-full" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-2 ${
                      item.is_sold_out
                        ? 'opacity-60 border-gray-200'
                        : 'border-orange-100 hover:border-orange-300'
                    }`}
                  >
                    {/* Food Image */}
                    <div className="relative w-full h-56 bg-gradient-to-br from-orange-100 to-amber-100 overflow-hidden">
                      <Image
                        src={item.image?.startsWith('/') ? item.image : `/images/${item.image || '1.JPG'}`}
                        alt={item.name || 'Food item'}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      {item.is_sold_out && (
                        <div className="absolute top-3 end-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                          {lang === 'en' ? 'Sold Out' : lang === 'ar' ? 'نفذت الكمية' : 'تەواوبووە'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 md:p-6">
                      <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900 leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm leading-relaxed min-h-[2.5rem]">
                        {item.description || ''}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
                        <span className="text-2xl font-black text-orange-600">
                          {Number(item.price || 0).toLocaleString()} IQD
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={item.is_sold_out}
                          className={`px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-bold transition-all duration-300 flex items-center gap-1.5 shadow-md ${
                            item.is_sold_out
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:scale-105 hover:shadow-lg'
                          }`}
                        >
                          <Plus size={18} />
                          <span>{lang === 'en' ? 'Add' : lang === 'ar' ? 'إضافة' : 'زیادکردن'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Cart & Checkout Modal (The old way - No customer login) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-orange-200">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h2 className="text-2xl font-black text-orange-600">
                {orderSuccess
                  ? lang === 'en' ? 'Order Confirmation' : lang === 'ar' ? 'تأكيد الطلب' : 'سەرکەوتوو بوو'
                  : isCheckout
                  ? lang === 'en' ? 'Delivery Details' : lang === 'ar' ? 'معلومات التوصيل' : 'زانیاریەکانی گەیاندن'
                  : lang === 'en' ? 'Your Cart' : lang === 'ar' ? 'سلة الطلبات' : 'سەڵەتی کڕین'}
              </h2>
              <button
                onClick={closeCartModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                aria-label="Close cart"
              >
                <X size={24} />
              </button>
            </div>

            {orderSuccess ? (
              /* Order Success Screen */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-black text-gray-900">
                  {lang === 'en' ? 'Order Placed Successfully!' : lang === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'داواکاریەکەت بە سەرکەوتوویی نێردرا!'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {lang === 'en'
                    ? 'Thank you! Your order has been received and is being prepared.'
                    : lang === 'ar'
                    ? 'شكراً لك! تم استلام طلبك وجاري تحضيره.'
                    : 'سوپاس! داواکاریەکەت گەیشت و لە ئامادەکردندایە.'}
                </p>
                <div className="bg-orange-50 p-4 rounded-2xl text-left rtl:text-right border border-orange-100">
                  <p className="font-bold text-gray-800 text-sm">👤 {name}</p>
                  <p className="text-gray-600 text-xs mt-1">📱 {phone}</p>
                  <p className="text-gray-600 text-xs mt-1">🏢 {building}</p>
                  {comment && <p className="text-gray-500 text-xs mt-1">💬 {comment}</p>}
                </div>
                <button
                  onClick={closeCartModal}
                  className="w-full py-3.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-md"
                >
                  {lang === 'en' ? 'Back to Menu' : lang === 'ar' ? 'العودة إلى القائمة' : 'گەڕانەوە بۆ مێنۆ'}
                </button>
              </div>
            ) : (
              <>
                {/* Stage 1: Cart Items */}
                <div style={{ display: isCheckout ? 'none' : 'block' }}>
                  <Checkout
                    cart={cart}
                    updateQuantity={updateQuantity}
                    getTotalPrice={getTotalPrice}
                    handleCheckout={handleCheckout}
                    lang={lang}
                  />
                </div>

                {/* Stage 2: Customer Info (The old way) */}
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
                  <button
                    type="button"
                    onClick={() => setIsCheckout(false)}
                    className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-800 font-semibold text-center"
                  >
                    ← {lang === 'en' ? 'Back to Cart' : lang === 'ar' ? 'العودة للسلة' : 'گەڕانەوە بۆ سەڵەت'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin Menu Update Modal (Login Required) */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentMenu={allMenus}
        onMenuUpdated={(updated) => {
          setAllMenus(updated);
        }}
        lang={lang}
      />
    </div>
  );
};

export default RestaurantApp;
