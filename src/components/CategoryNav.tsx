import React from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../types';

export const CategoryNav: React.FC<{ 
  categories: Category[], 
  selected: string | null, 
  onSelect: (id: string | null) => void 
}> = ({ categories, selected, onSelect }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-3 sm:py-6 hide-scrollbar px-2 sm:px-4 md:px-0">
      <button
        onClick={() => onSelect(null)}
        className={`flex flex-col items-center gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[80px] group transition-all ${
          selected === null ? 'text-orange-600' : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all shadow-sm ${
          selected === null ? 'bg-orange-600 text-white border-2 border-orange-200' : 'bg-white border border-gray-100 group-hover:border-gray-300'
        }`}>
          ✨
        </div>
        <span className="text-[10px] sm:text-xs font-semibold">{t('common.all')}</span>
      </button>
      
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex flex-col items-center gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[80px] group transition-all ${
            selected === cat.id ? 'text-orange-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all shadow-sm ${
            selected === cat.id ? 'bg-orange-600 text-white border-2 border-orange-200' : 'bg-white border border-gray-100 group-hover:border-gray-300'
          }`}>
            {cat.icon}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold">{cat.name}</span>
        </button>
      ))}
    </div>
  );
};
