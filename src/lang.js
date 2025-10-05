import { useState } from 'react';
import { Languages } from 'lucide-react';

const LanguageDropdown = ({ currentLang, setLang }) => {
  const [open, setOpen] = useState(false);
  const languages = [
    { code: 'krd', label: 'کوردی (سۆرانی)' },
    { code: 'ar', label: 'العربية' },



  ];
  const text = currentLang === 'en' ? "English" : currentLang === 'ar' ? "عربي" : "کوردی";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative px-4 py-2 text-white rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
        style={{ backgroundColor: '#E35711' }}
      >
        <Languages size={20} />
        <span className="hidden sm:inline">{text}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLang(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-orange-100 rounded-lg ${currentLang === lang.code ? 'font-bold text-orange-600' : 'text-gray-700'
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
