import React from 'react';

interface AgeRangeFilterProps {
  minAge: string;
  maxAge: string;
  onMinAgeChange: (value: string) => void;
  onMaxAgeChange: (value: string) => void;
}

const AgeRangeFilter: React.FC<AgeRangeFilterProps> = ({ minAge, maxAge, onMinAgeChange, onMaxAgeChange }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">סינון לפי טווח גילאים</h3>
      <div className="flex items-center gap-4 max-w-md">
        <div className="flex-1">
          <label htmlFor="min-age" className="block text-sm font-medium text-gray-700">מגיל</label>
          <input
            type="number"
            id="min-age"
            value={minAge}
            onChange={(e) => onMinAgeChange(e.target.value)}
            placeholder="לדוגמה: 7"
            className="mt-1 w-full px-3 py-2 text-base text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 transition-colors duration-300"
            min="0"
            aria-label="גיל מינימלי"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="max-age" className="block text-sm font-medium text-gray-700">עד גיל</label>
          <input
            type="number"
            id="max-age"
            value={maxAge}
            onChange={(e) => onMaxAgeChange(e.target.value)}
            placeholder="לדוגמה: 12"
            className="mt-1 w-full px-3 py-2 text-base text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-orange-500 transition-colors duration-300"
            min="0"
            aria-label="גיל מקסימלי"
          />
        </div>
      </div>
    </div>
  );
};

export default AgeRangeFilter;