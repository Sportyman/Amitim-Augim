
import React from 'react';
import { Category } from '../types';
import { ICON_MAP } from '../constants';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  useGradientDesign?: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategories, onCategoryToggle, useGradientDesign = false }) => {
  
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

        // Design Logic
        // Active: Stronger gradient, shadow, scale effect
        const activeGradient = "bg-gradient-to-tr from-sky-500 via-pink-500 to-sky-500 shadow-md scale-110";
        
        // Inactive (Colorful Mode): Pastel gradient (Sky -> Pink -> Sky) visible even when not selected
        // Inactive (Classic Mode): Simple gray border
        const inactiveGradient = "bg-gradient-to-tr from-sky-300 via-pink-300 to-sky-300 opacity-80 hover:opacity-100 hover:scale-105";
        
        const borderClass = useGradientDesign 
            ? (isSelected ? activeGradient : inactiveGradient)
            : (isSelected ? 'bg-sky-500' : 'bg-gray-200 group-hover:bg-sky-200');

        // Icon Color Logic
        const iconColorClass = useGradientDesign
            ? (isSelected ? 'text-pink-600' : 'text-gray-400 group-hover:text-sky-500')
            : (isSelected ? 'text-sky-600' : 'text-gray-400 group-hover:text-sky-600');

        return (
          <div key={category.id} className="flex flex-col items-center gap-3 group cursor-pointer" onClick={() => onCategoryToggle(category.id)}>
            {/* Button Wrapper for Border - p-[3px] keeps it fine/thin */}
            <div className={`p-[3px] rounded-full transition-all duration-300 ${borderClass}`}>
                <button
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-white transition-all duration-300 backface-hidden`}
                >
                  {IconComponent ? (
                      <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${iconColorClass}`} />
                  ) : (
                      <span className="text-3xl sm:text-4xl select-none leading-none filter drop-shadow-sm">{emojiChar || '✨'}</span>
                  )}
                </button>
            </div>
            
            <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${isSelected ? 'text-sky-700 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>
              {category.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
