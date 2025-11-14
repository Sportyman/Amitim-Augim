import React from 'react';

interface MultiSelectFilterProps {
  title: string;
  options: string[];
  selectedOptions: string[];
  onToggle: (option: string) => void;
}
export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ title, options, selectedOptions, onToggle }) => {
  if (options.length <= 1) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              onClick={() => onToggle(option)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-200 ${
                isSelected
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};
