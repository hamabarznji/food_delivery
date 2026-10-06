'use client';

import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Save, Plus, Trash2, X, Check, AlertCircle, Edit2 } from 'lucide-react';

const AdminModal = ({
  isOpen,
  onClose,
  currentMenu,
  onMenuUpdated,
  lang = 'krd',
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Editing state
  const [activeCategory, setActiveCategory] = useState('grills');
  const [editableMenu, setEditableMenu] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [newItemModal, setNewItemModal] = useState(false);

  // New item form
  const [newItem, setNewItem] = useState({
    id: '',
    name_en: '',
    name_ar: '',
    name_krd: '',
    price: 4000,
    description_en: '',
    description_ar: '',
    description_krd: '',
    image: '1.JPG',
  });

  // Check initial auth status
  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/check')
        .then((res) => res.json())
        .then((data) => {
          setIsAuthenticated(data.authenticated);
        })
        .catch(() => setIsAuthenticated(false));
    }
  }, [isOpen]);

  // Clone menu data for local editing
  useEffect(() => {
    if (currentMenu) {
      setEditableMenu(JSON.parse(JSON.stringify(currentMenu)));
      const cats = Object.keys(currentMenu.en || currentMenu.krd || {});
      if (cats.length && !cats.includes(activeCategory)) {
        setActiveCategory(cats[0]);
      }
    }
  }, [currentMenu]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError(data.error || 'Password incorrect');
      }
    } catch (err) {
      setLoginError('Connection error, please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setPassword('');
  };

  const handlePriceChange = (category, itemId, newPrice) => {
    const val = parseInt(newPrice, 10) || 0;
    setEditableMenu((prev) => {
      const updated = { ...prev };
      ['en', 'ar', 'krd'].forEach((l) => {
        if (updated[l]?.[category]) {
          updated[l][category] = updated[l][category].map((it) =>
            it.id === itemId ? { ...it, price: val } : it
          );
        }
      });
      return updated;
    });
  };

  const handleToggleAvailable = (category, itemId) => {
    setEditableMenu((prev) => {
      const updated = { ...prev };
      ['en', 'ar', 'krd'].forEach((l) => {
        if (updated[l]?.[category]) {
          updated[l][category] = updated[l][category].map((it) =>
            it.id === itemId ? { ...it, is_sold_out: !it.is_sold_out } : it
          );
        }
      });
      return updated;
    });
  };

  const handleDeleteItem = (category, itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setEditableMenu((prev) => {
      const updated = { ...prev };
      ['en', 'ar', 'krd'].forEach((l) => {
        if (updated[l]?.[category]) {
          updated[l][category] = updated[l][category].filter((it) => it.id !== itemId);
        }
      });
      return updated;
    });
  };

  const handleAddNewItem = (e) => {
    e.preventDefault();
    const id = newItem.id.trim() || `item-${Date.now()}`;
    const price = parseInt(newItem.price, 10) || 0;

    setEditableMenu((prev) => {
      const updated = { ...prev };
      // English
      if (updated.en?.[activeCategory]) {
        updated.en[activeCategory].push({
          id,
          name: newItem.name_en || newItem.name_krd || 'New Item',
          description: newItem.description_en,
          price,
          image: newItem.image || '1.JPG',
        });
      }
      // Arabic
      if (updated.ar?.[activeCategory]) {
        updated.ar[activeCategory].push({
          id,
          name: newItem.name_ar || newItem.name_en || 'عنصر جديد',
          description: newItem.description_ar,
          price,
          image: newItem.image || '1.JPG',
        });
      }
      // Kurdish
      if (updated.krd?.[activeCategory]) {
        updated.krd[activeCategory].push({
          id,
          name: newItem.name_krd || newItem.name_en || 'خواردنی نوێ',
          description: newItem.description_krd,
          price,
          image: newItem.image || '1.JPG',
        });
      }
      return updated;
    });

    setNewItemModal(false);
    setNewItem({
      id: '',
      name_en: '',
      name_ar: '',
      name_krd: '',
      price: 4000,
      description_en: '',
      description_ar: '',
      description_krd: '',
      image: '1.JPG',
    });
  };

  const handleSaveChanges = async () => {
    setSaveLoading(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: editableMenu }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('Menu changes saved successfully! / مێنۆ بە سەرکەوتوویی نوێکرایەوە');
        if (onMenuUpdated) onMenuUpdated(editableMenu);
      } else {
        alert(data.error || 'Failed to save menu');
      }
    } catch (err) {
      alert('Network error while saving menu');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLangCode = lang === 'en' ? 'en' : lang === 'ar' ? 'ar' : 'krd';
  const categoriesList = Object.keys(editableMenu?.[currentLangCode] || editableMenu?.en || {});
  const currentCategoryItems = editableMenu?.[currentLangCode]?.[activeCategory] || [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-orange-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-orange-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-600 text-white rounded-2xl shadow-md">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {isAuthenticated
                  ? lang === 'en'
                    ? 'Menu Management'
                    : lang === 'ar'
                      ? 'إدارة المنيو وتحديث الأسعار'
                      : 'بەڕێوەبردن و دەستکاریکردنی مێنۆ'
                  : lang === 'en'
                    ? 'Staff Login'
                    : lang === 'ar'
                      ? 'تسجيل دخول الموظفين'
                      : 'چوونەژوورەوەی ستاف'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {isAuthenticated
                  ? 'Update prices, items, and availability'
                  : 'Enter password to update menu items'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                title="Log Out"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isAuthenticated ? (
            /* Login Form */
            <div className="max-w-md mx-auto py-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {lang === 'en'
                    ? 'Admin Access Required'
                    : lang === 'ar'
                      ? 'مطلوب كلمة مرور الإدارة'
                      : 'وشەی نهێنی بەڕێوەبەر داواکراوە'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'en'
                    ? 'Customers do not log in. This login is strictly for staff to update the menu.'
                    : 'کڕیار پێویست بە چوونەژوورەوە ناکات. ئەمە تەنها بۆ ستافە بۆ دەستکاریکردنی مێنۆ.'}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Password' : lang === 'ar' ? 'كلمة المرور' : 'وشەی نهێنی'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: pasha2026</p>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                    <AlertCircle size={18} />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loginLoading ? 'Checking...' : lang === 'en' ? 'Log In' : 'چوونەژوورەوە'}
                </button>
              </form>
            </div>
          ) : (
            /* Menu Manager */
            <div>
              {saveMessage && (
                <div className="mb-4 flex items-center gap-2 p-3.5 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-2xl">
                  <Check size={20} />
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* Category Navigation */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-100">
                {categoriesList.map((catKey) => {
                  const isActive = activeCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setActiveCategory(catKey)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {catKey}
                    </button>
                  );
                })}
              </div>

              {/* Items in active category */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-800 capitalize">
                  {activeCategory} ({currentCategoryItems.length} items)
                </h3>
                <button
                  onClick={() => setNewItemModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow hover:bg-emerald-700 transition-all"
                >
                  <Plus size={18} />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {currentCategoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${
                      item.is_sold_out
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-orange-100 hover:border-orange-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-orange-100 overflow-hidden shrink-0 relative">
                        <img
                          src={item.image?.startsWith('/') ? item.image : `/images/${item.image || '1.JPG'}`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500 truncate max-w-md">
                          {item.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {/* Price input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="250"
                          value={item.price || 0}
                          onChange={(e) => handlePriceChange(activeCategory, item.id, e.target.value)}
                          className="w-24 px-2.5 py-1.5 font-bold text-orange-600 text-right border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-xs font-bold text-gray-600">IQD</span>
                      </div>

                      {/* Sold out toggle */}
                      <button
                        onClick={() => handleToggleAvailable(activeCategory, item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.is_sold_out
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {item.is_sold_out ? 'Sold Out' : 'Available'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteItem(activeCategory, item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (When Authenticated) */}
        {isAuthenticated && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Changes are saved to live menu JSON.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-bold text-sm transition-all"
              >
                Close
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saveLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Save size={18} />
                <span>{saveLoading ? 'Saving...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Add New Item Sub-Modal */}
        {newItemModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">
                  Add Item to {activeCategory}
                </h3>
                <button
                  onClick={() => setNewItemModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddNewItem} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.name_en}
                    onChange={(e) => setNewItem({ ...newItem, name_en: e.target.value })}
                    className="w-full p-2.5 border rounded-lg text-sm"
                    placeholder="e.g. Crispy Tenders"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Name (Kurdish)
                    </label>
                    <input
                      type="text"
                      value={newItem.name_krd}
                      onChange={(e) => setNewItem({ ...newItem, name_krd: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm"
                      placeholder="ناوەکەی بە کوردی"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Name (Arabic)
                    </label>
                    <input
                      type="text"
                      value={newItem.name_ar}
                      onChange={(e) => setNewItem({ ...newItem, name_ar: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm"
                      placeholder="الاسم بالعربي"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Price (IQD)
                    </label>
                    <input
                      type="number"
                      step="250"
                      required
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Image filename
                    </label>
                    <input
                      type="text"
                      value={newItem.image}
                      onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm"
                      placeholder="1.JPG"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Description / Ingredients
                  </label>
                  <textarea
                    value={newItem.description_en}
                    onChange={(e) => setNewItem({ ...newItem, description_en: e.target.value })}
                    className="w-full p-2.5 border rounded-lg text-sm resize-none"
                    rows={2}
                    placeholder="Ingredients or description..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setNewItemModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-bold bg-orange-600 text-white rounded-lg shadow"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
