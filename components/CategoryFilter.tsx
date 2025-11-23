
import React from 'react';
import { Category } from '../types';
import { ICON_MAP } from '../constants';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategories, onCategoryToggle }) => {
  
  // Filter out hidden categories
  const visibleCategories = categories.filter(c => c.isVisible !== false).sort((a, b) => (a.order || 99) - (b.order || 99));

  return (
    <div className="flex justify-center flex-wrap gap-6 sm:gap-8">
      {visibleCategories.map((category) => {
        const isSelected = selectedCategories.includes(category.id);
        
        // Resolve Icon (Component or Emoji)
        const IconComponent = ICON_MAP[category.iconId || ''] || null;
        const isEmoji = category.iconId?.startsWith('emoji:');
        const emojiChar = isEmoji ? category.iconId?.split(':')[1] : null;

        return (
          <div key={category.id} className="flex flex-col items-center gap-3 group">
            {/* Button Wrapper for Gradient Border */}
            <div className={`p-[2px] rounded-full transition-all duration-300 ${
                isSelected 
                    ? 'bg-gradient-to-tr from-sky-400 via-purple-400 to-pink-400 shadow-lg scale-110' 
                    : 'bg-gradient-to-tr from-gray-100 to-gray-200 hover:from-sky-200 hover:to-purple-200'
            }`}>
                <button
                  onClick={() => onCategoryToggle(category.id)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-white transition-all duration-300 backface-hidden`}
                >
                  {IconComponent ? (
                      <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${isSelected ? 'text-purple-600' : 'text-gray-400 group-hover:text-sky-500'}`} />
                  ) : (
                      <span className="text-3xl sm:text-4xl select-none leading-none filter drop-shadow-sm">{emojiChar || '✨'}</span>
                  )}
                </button>
            </div>
            
            <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${isSelected ? 'text-purple-700 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>
              {category.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;