// REVIEW: Code checked for clarity, functionality, and potential issues. The component is well-designed and functional.

import React from 'react';
import { Category } from '../types.ts';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategories, onCategoryToggle }) => {
  return (
    <div className="flex justify-center flex-wrap gap-4 sm:gap-6">
      {categories.map((category) => {
        const isSelected = selectedCategories.includes(category.id);
        const Icon = category.icon;
        return (
          <div key={category.id} className="flex flex-col items-center gap-2">
            <button
              onClick={() => onCategoryToggle(category.id)}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                isSelected
                  ? 'bg-orange-100 border-orange-500 scale-105'
                  : 'bg-white border-gray-300 hover:border-orange-400'
              }`}
            >
              <Icon className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${isSelected ? 'text-orange-500' : 'text-gray-500'}`} />
            </button>
            <span className={`text-sm sm:text-base font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
              {category.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;