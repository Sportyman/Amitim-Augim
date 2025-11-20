import React from 'react';

interface PriceRangeFilterProps {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({ minPrice, maxPrice, onMinPriceChange, onMaxPriceChange }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">סינון לפי מחיר (₪)</h3>
      <div className="flex items-center gap-4 max-w-md">
        <div className="flex-1">
          <label htmlFor="min-price" className="block text-sm font-medium text-gray-700">מחיר מינימלי</label>
          <input
            type="number"
            id="min-price"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            placeholder="לדוגמה: 100"
            className="mt-1 w-full px-3 py-2 text-base text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-sky-500 transition-colors duration-300"
            min="0"
            aria-label="מחיר מינימלי"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="max-price" className="block text-sm font-medium text-gray-700">מחיר מקסימלי</label>
          <input
            type="number"
            id="max-price"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="לדוגמה: 300"
            className="mt-1 w-full px-3 py-2 text-base text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-sky-500 transition-colors duration-300"
            min="0"
            aria-label="מחיר מקסימלי"
          />
        </div>
      </div>
    </div>
  );
};

export default PriceRangeFilter;