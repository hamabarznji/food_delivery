'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';

const LanguageDropdown = ({ currentLang = 'krd', setLang }) => {
  const [open, setOpen] = useState(false);
  const languages = [
    { code: 'krd', label: 'کوردی (سۆرانی)' },
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
  ];

  const text = currentLang === 'en' ? 'English' : currentLang === 'ar' ? 'عربي' : 'کوردی';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative px-3 sm:px-4 py-2 text-white rounded-full transition-all duration-300 transform hover:scale-105 shadow-md flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
      >
        <Languages size={18} />
        <span className="text-xs sm:text-sm font-bold">{text}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl z-50 border border-orange-100 overflow-hidden py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                if (setLang) setLang(lang.code);
                setOpen(false);
              }}
              className={`w-full text-right rtl:text-right ltr:text-left px-4 py-2.5 text-sm font-bold transition-all hover:bg-orange-50 ${
                currentLang === lang.code ? 'text-orange-600 bg-orange-50/50' : 'text-gray-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
